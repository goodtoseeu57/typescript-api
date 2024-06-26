#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { TypescriptApiStack } from "../lib/typescript-api-stack";

const app = new cdk.App();
const env = app.node.tryGetContext("environment");
const envConfig = app.node.tryGetContext(env);

console.log(`Deploying to ${envConfig} environment`);

new TypescriptApiStack(app, "Stack");
