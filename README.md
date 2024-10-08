# Ringier Tech Summit 2024

## Clone the repo locally (optional)
```
git clone https://github.com/mauriziolongo/ringier-tech-summit-2024.git
```

## Access to AWS Console

- https://catalog.us-east-1.prod.workshops.aws/join?access-code=<team-code>
- https://catalog.us-east-1.prod.workshops.aws/event/account-login

## Deploy Repo on your account using Cloud 9
- Go to AWS Cloud9 using "Search bar"
- Click "Create Environment"
- Insert a name e.g. "Ringier Tech Summit"
- Select "Additional Instance type" and choose "t3.medium"
- click "Create" and waiting until the environment is ready
- open AWS Cloud 9
- using terminal clone the repo - "git clone https://github.com/mauriziolongo/ringier-tech-summit-2024.git"
- cd ringier-moderation
- cdk bootstrap
- npm install
- cdk deploy --require-approval never

## Optional for streaming
- OBS Studio - [https://obsproject.com/](https://obsproject.com/)

- **broadcast page: ** - Visit [https://stream.ivs.rocks/](https://stream.ivs.rocks/) and add your channel's `ingest endpoint` and `stream key` on the settings screen.

- **streaming client** - Visit[https://debug.ivsdemos.com/](https://debug.ivsdemos.com/) and add your playbackUrl
