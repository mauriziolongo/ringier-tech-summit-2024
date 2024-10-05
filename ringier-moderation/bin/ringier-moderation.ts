#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RingierModerationStack } from '../lib/ringier-moderation-stack';

const app = new cdk.App();
const ivsStack = new RingierModerationStack(app, 'RingierModerationStack', {});
