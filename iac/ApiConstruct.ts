import { Stack } from "aws-cdk-lib";
import { RestApi, LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";

interface LambdaConfig {
  functionName: string;
  handler: string;
  resourcePath: string;
  httpMethod: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS"; //make that an enum if you want  to restrict the values
  codePath: string;
}

const lambdaConfigs: LambdaConfig[] = [
  {
    functionName: "CreateNote",
    handler: "createNote.handler",
    resourcePath: "create-note",
    httpMethod: "POST",
    codePath: join(
      __dirname,
      "./../src/resources/my-lambdas/create-note",
      "index.ts"
    ),
  },
];

export class ApiConstruct extends Construct {
  constructor(private readonly scope: Stack, id: string) {
    super(scope, id);
  }
  public createRestApi() {
    const api = new RestApi(this, "my-api", {
      restApiName: "my-api",
      description: "This is my api",
    });

    lambdaConfigs.forEach((config) => {
      const lambda = this.createLambdaFunction(config);
      const integration = new LambdaIntegration(lambda);
      api.root
        .addResource(config.resourcePath)
        .addMethod(config.httpMethod, integration);
    });

    return api;
  }

  private createLambdaFunction(config: LambdaConfig): NodejsFunction {
    return new NodejsFunction(this, config.functionName, {
      runtime: Runtime.NODEJS_20_X,
      entry: config.codePath,
      handler: config.handler,
    });
  }
}
