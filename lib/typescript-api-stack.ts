import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { ApiConstruct } from "../iac/ApiConstruct";
export class TypescriptApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      stackName: "TypescriptApiStack12",
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
    });

    new ApiConstruct(this, "ApiConstruct").createRestApi();
  }
}
