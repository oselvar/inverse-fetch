import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Handler } from 'aws-lambda';
export type ProxyHandler = Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2>;

export const handler: ProxyHandler = async (event, context) => {
  return {
    statusCode: 201,
    body: JSON.stringify({
      message: 'Unknown endpoint',
    }),
  };
};
