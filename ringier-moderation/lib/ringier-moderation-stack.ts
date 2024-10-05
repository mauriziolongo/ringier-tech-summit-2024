import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3notifications from 'aws-cdk-lib/aws-s3-notifications';
import { CfnChannel, CfnStreamKey, CfnRecordingConfiguration } from 'aws-cdk-lib/aws-ivs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export class RingierModerationStack extends cdk.Stack {

  public readonly playbackUrl: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get the stack ID dynamically
    const stackId = cdk.Fn.select(2, cdk.Fn.split('/', this.stackId));

    // Define the bucket name using "ringier-ivs" + stack ID
    const bucketName = `ringier-ivs-${stackId}`;

    // Create an S3 bucket with the dynamic name
    const ivsBucket = new s3.Bucket(this, 'RingierIVSBucket', {
      bucketName: bucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,  // Remove bucket on stack deletion
      autoDeleteObjects: true,  // Delete objects when bucket is deleted
      versioned: false,  // Disable versioning
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,  // Block public access
    });

    // Create an IAM Role for IVS to write to the S3 bucket
    const recordingRole = new iam.Role(this, 'IvsRecordingRole', {
      assumedBy: new iam.ServicePrincipal('ivs.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess') // Give IVS access to the S3 bucket
      ]
    });

    // Create an IVS Recording Configuration for thumbnails only (CfnRecordingConfiguration)
    const recordingConfiguration = new CfnRecordingConfiguration(this, 'RingierRecordingConfig', {
      destinationConfiguration: {
        s3: {
          bucketName: ivsBucket.bucketName
        }
      },
      renditionConfiguration: {
        renditionSelection : 'NONE'
      },
      thumbnailConfiguration: {
        recordingMode: 'INTERVAL', // Record thumbnails periodically
        storage: ['SEQUENTIAL'],
        targetIntervalSeconds: 5, // Capture thumbnails every 5 seconds
      },
      recordingReconnectWindowSeconds: 0, // No reconnection window since we're only recording thumbnails
      name: 'ivs-recoding-conf',
    });

    // Create an IVS Channel using L1 construct (CfnChannel) and attach the recording configuration
    const ivsChannel = new CfnChannel(this, 'RingierIVSChannel', {
      authorized: false,  // Whether the channel is authorized (token-based access)
      latencyMode: 'LOW',  // Options: 'LOW', 'NORMAL'
      type: 'STANDARD',  // Options: 'BASIC', 'STANDARD'
      recordingConfigurationArn: recordingConfiguration.attrArn, // Attach recording configuration
      name: 'ivs-channel-ringier'
    });

    // Create a stream key for the channel using CfnStreamKey
    const streamKey = new CfnStreamKey(this, 'RingierIVSStreamKey', {
      channelArn: ivsChannel.attrArn
    });

    const adminRole = new iam.Role(this, 'LambdaAdminRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
      ]
    });    

    // Create a Lambda function to handle thumbnail uploads
    const thumbnailHandler = new lambda.Function(this, 'ThumbnailHandler', {
      functionName : 'IVS-lambda-handler',
      runtime: lambda.Runtime.PYTHON_3_9, // Specify the Python runtime
      handler: 'index.handler', // Specify the handler method
      code: lambda.Code.fromAsset('lambda'), // Path to the Lambda code
      environment: {
        BUCKET_NAME: ivsBucket.bucketName, // Pass the bucket name to the function,
        CHANNEL_ARN : ivsChannel.attrArn
      },
      timeout: cdk.Duration.minutes(15), // Set timeout to 15 minutes
      role: adminRole      
    });


    // Grant the Lambda function permission to read from the S3 bucket
    ivsBucket.grantRead(thumbnailHandler);

    // Add an S3 event notification to the bucket to trigger the Lambda function
    ivsBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3notifications.LambdaDestination(thumbnailHandler));

    const jsonconfig = {
      "playbackUrl" : `${ivsChannel.attrPlaybackUrl}`,
    };

     //copying the source file to the S3 Bucket for demo website
     new s3deploy.BucketDeployment(this, "DeployConfig", {
      sources: [s3deploy.Source.data('config.json', JSON.stringify(jsonconfig)),s3deploy.Source.asset("website")],
      destinationBucket: ivsBucket,
    });   
    
    const s3origin = new origins.S3Origin(ivsBucket);

    const distributionDemo = new cloudfront.Distribution(this, "DistributionDemo", {
      defaultRootObject: "index.html",
      enableLogging: false,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2016,
      defaultBehavior: {
        origin: s3origin,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      }
    });  

    // Output the CloudFront distribution domain name (URL of the website)
    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: distributionDemo.domainName,
      description: 'The URL of the static website hosted on S3 and distributed by CloudFront',
    }); 

    this.playbackUrl = new cdk.CfnOutput(this, 'PlaybackUrl', {
      value: ivsChannel.attrPlaybackUrl,
      description: 'IVS Channel Playback URL',
      exportName: 'IvsPlaybackUrl',
    });    
    
    // Output the channel ARN
    new cdk.CfnOutput(this, 'ChannelArn', {
      value: ivsChannel.attrArn,
      description: 'The ARN of the IVS Channel',
    });

    // Output the stream key value
    new cdk.CfnOutput(this, 'StreamKeyValue', {
      value: streamKey.attrValue,
      description: 'The stream key of the IVS Channel',
    });

    // Output the S3 bucket for thumbnails
    new cdk.CfnOutput(this, 'IvsS3Bucket', {
      value: ivsBucket.bucketName,
      description: 'The S3 bucket where IVS thumbnails are stored',
    });
  }
}
