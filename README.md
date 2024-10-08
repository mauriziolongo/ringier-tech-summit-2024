# Ringier Tech Summit 2024

## Clone the repo locally (optional)
```
git clone https://github.com/mauriziolongo/ringier-tech-summit-2024.git
```

## Access to AWS Console

- https://catalog.us-east-1.prod.workshops.aws/join?access-code=XXXXXXXX
- https://catalog.us-east-1.prod.workshops.aws/event/account-login

## Amazon IVS use case examples:
- https://ivs.rocks/ 

## Deploy Demo on your account using Cloud 9
- Go to AWS Cloud9 using "Search bar"
- Click "Create Environment"
- Insert a name e.g. "Ringier Tech Summit"
- Select "Additional Instance type" and choose "t3.medium"
- click "Create" and waiting until the environment is ready
- open AWS Cloud 9
- using terminal clone the repo - "git clone https://github.com/mauriziolongo/ringier-tech-summit-2024.git"
- cd ringier-tech-summit-2024/ringier-moderation
- npm install
- cdk bootstrap
- cdk deploy --require-approval never
- copy the outputs somewhere

## Tools for broadcasting and streaming

- **broadcast tool:** - OBS Studio - [https://obsproject.com/](https://obsproject.com/)

- **broadcast page:** - Visit [https://stream.ivs.rocks/](https://stream.ivs.rocks/) and add your channel's `ingest endpoint` and `stream key` on the settings screen.

- **streaming client** - Visit[https://debug.ivsdemos.com/](https://debug.ivsdemos.com/) and add your `playbackUrl`

- **ingesting Metadata to IVS channel**
```
aws ivs put-metadata   --channel-arn arn:aws:ivs:xxxxxxx   --metadata '{this is coming from cli}'

```

## Images for Amazon Rekognition test

- Label detection
```
https://www.shutterstock.com/image-vector/summer-3d-realistic-render-vector-600nw-2139770563.jpg
https://images.contenthub.dev/kai2gu38cwfq/329eed37c8a7d4857fcf40c7615a4580/Isenau,%20Diablerets,%20VTT%20et%20E-Bike%20(c)%20Alain%20Rumpf%20(59)%20(1).jpg
https://plus.unsplash.com/premium_photo-1664474619075-644dd191935f?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8aW1hZ2V8ZW58MHx8MHx8fDA%3D
```

- Image moderation
```
https://upload.wikimedia.org/wikipedia/commons/4/4f/SIG_Pro_by_Augustas_Didzgalvis.jpg
```

## Demo UGC
https://d2i6gtbxnlunvv.cloudfront.net/
**user** - **User12024!**