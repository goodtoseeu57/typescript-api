import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamo from 'aws-cdk-lib/aws-dynamodb'
export class TypescriptApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new cognito.UserPool(this, 'myUserPool', {
      selfSignUpEnabled: true, // Allow users to sign up
      autoVerify: { email: true }, // Auto-verify email addresses
      userVerification: {
        emailSubject: `Verify your email for our app!`,
        emailBody: `Hello {username}, Thanks for signing up to our app! Your verification code is {####}`,
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      signInAliases: { email: true }, // Users can sign in using their email
    });

    // Create a Cognito User Pool Client
    new cognito.UserPoolClient(this, 'appClient', {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });


    const myLambda = new lambda.Function(this, 'HelloHandler', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('resources/my-lambda'),
      handler: 'index.handler'
    });

    const api = new apigateway.RestApi(this, 'MyApi', {
      restApiName: 'MyService',
      description: 'This service serves my functions.'
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'UserPoolAuthorizer', {
      cognitoUserPools: [ userPool ]
    });

    const table = new dynamo.Table(this, 'NotesTable', {
      partitionKey: { name: 'id', type: dynamo.AttributeType.STRING },
      tableName: 'Notes'
    })

    table.grantFullAccess(myLambda)

    const exampleResource = api.root.addResource('notes')
    const getIntegration = new apigateway.LambdaIntegration(myLambda);
    exampleResource.addMethod('GET', getIntegration, { authorizer });
  }
}
