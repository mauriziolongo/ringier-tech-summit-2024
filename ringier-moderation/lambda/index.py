import json
import boto3
import logging
import os
import base64

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')
runtime = boto3.client('bedrock-runtime') 
rekognition_client = boto3.client('rekognition')
ivs_client = boto3.client('ivs')

prompt = ''' 
Given an image, provide the following in JSON format:
{
  "objects": [
    "object1",
    "object2",
    "object3",
    ...
  ],
  "description": "A detailed description of the overall image content."
}
The "objects" list should contain the names of the major objects or elements present in the image. The "description" should be a concise yet comprehensive textual summary of the image content.
Please provide this information based on the image I will share with you.
'''

def detect_text(photo, bucket):

    
    fullText = ""

    response = rekognition_client.detect_text(Image={'S3Object': {'Bucket': bucket, 'Name': photo}})

    print('Detected text in', photo)
    for text in response['TextDetections']:
        fullText = fullText + " " + text['DetectedText']

    metadata = {
       "description": "text identified",
       "objects" : fullText[:600]

    }
    
 #   json_string = json.loads(metadata)

    return metadata

def detect_moderation(photo, bucket):

    
    fullText = ""

    response = rekognition_client.detect_moderation_labels(Image={'S3Object': {'Bucket': bucket, 'Name': photo}})

    print('Detected labels for ' + photo)
    for label in response['ModerationLabels']:
        print (label['Name'] + ' : ' + str(label['Confidence']))
        print (label['ParentName'])

    metadata = {
       "description": "Moderation",
       "objects" : response['ModerationLabels']

    }

    return metadata

def detect_face(photo, bucket):

    
    fullText = ""

    response = rekognition_client.detect_faces(Image={'S3Object': {'Bucket': bucket, 'Name': photo}},
                                   Attributes=['ALL'])

    print('Detected faces for', photo)
    print(response)
    for faceDetail in response['FaceDetails']:
         fullText = fullText + 'The detected face is between ' + str(faceDetail['AgeRange']['Low']) + ' and ' + str(faceDetail['AgeRange']['High']) + ' years old'
         fullText = fullText + "Gender: " + str(faceDetail['Gender'])
         fullText = fullText + "Smile: " + str(faceDetail['Smile'])
         fullText = fullText + "Eyeglasses: " + str(faceDetail['Eyeglasses'])
         fullText = fullText + "Face Occluded: " + str(faceDetail['FaceOccluded'])
         fullText = fullText + "Emotions: " + str(faceDetail['Emotions'][0])

    metadata = {
       "description": "Face detection",
       "objects" : response['FaceDetails'][0]['Emotions']

    }

    return metadata
    
    
def callBedrock(bucket, key):

    # Get the image from S3
    response = s3_client.get_object(Bucket=bucket, Key=key)
    image_data = response['Body'].read()

    # Encode image to base64
    encoded_image = base64.b64encode(image_data).decode('utf-8')    

    
    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "temperature": 0.4,            
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": encoded_image,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt,               
                        }
                    ],
                },
                {
                    "role": 'assistant',
                    "content": '{',
                 }
            ],
        }
    )
    try:
        response = runtime.invoke_model(
            modelId="anthropic.claude-3-haiku-20240307-v1:0",
            body=body
        )
    except:
        print("Something else went wrong")    
        return {
            "{\"objects\":'',\"description\":}"
        }
    
    # Process and print the response
    result = json.loads(response.get("body").read()).get("content", [])[0].get("text", "")
    #print(result)
    
    jsonOutput = json.loads("{" + result)
    

    #print(jsonOutput)
    
    return jsonOutput

def handler(event, context):
    
    
    logger.info("Received event: %s", json.dumps(event))

    # Extract bucket name and object key from the event
    bucket_name = event['Records'][0]['s3']['bucket']['name']
    object_key = event['Records'][0]['s3']['object']['key']

    # Log the bucket name
    logger.info("Bucket name: %s", bucket_name)
    logger.info("Object key: %s", object_key)
    
    # Extract the image name from the object key
    image_name = os.path.basename(object_key)  # This gets the last part of the path
    logger.info("Image name: %s", image_name)

    text = detect_moderation(object_key, bucket_name)

#    text = detect_face(object_key, bucket_name)
#    text = detect_text(object_key, bucket_name)
#    text = callBedrock(bucket_name,object_key)

    
    # Your IVS channel ARN
    channel_arn =  os.environ['CHANNEL_ARN'] #'arn:aws:ivs:eu-central-1:381491929363:channel/fCGkB0GiDrAh'
    
    # Metadata to insert
    metadata = {
       "type": "rekognition",
       "title": image_name,
       "description": text,
       "image" : object_key

    }
    
    json_string = json.dumps(metadata)

    
    try:
        # Insert the metadata
        response = ivs_client.put_metadata(
            channelArn=channel_arn,
            metadata=json_string
        )
        
        print(f"Metadata inserted successfully: {response}")
        return {
            'statusCode': 200,
            'body': json.dumps('Metadata inserted successfully')
        }
    except ivs_client.exceptions.ChannelNotBroadcasting:
        print("The channel is not currently broadcasting")
        return {
            'statusCode': 400,
            'body': json.dumps('Channel is not broadcasting')
        }
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }