import { NestFactory } from '@nestjs/core';
import serverlessExpress from '@vendia/serverless-express';
import { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';

let server: Handler;

async function bootstrap(): Promise<Handler> {
  const app = await NestFactory.create(AppModule);
  //Configs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      disableErrorMessages: false,
    }),
  );
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  //Middlewares??

  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

function waitForServer(event: any, context: any, callback: any) {
  setImmediate(() => {
    if (!server) {
      waitForServer(event, context, callback);
    } else {
      return server(event, context, callback);
    }
  });
}

if (process.env.IS_OFFLINE !== 'true')
  bootstrap().then((srv) => (server = srv));

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  if (process.env.IS_OFFLINE === 'true') {
    server = server ?? (await bootstrap());
    return server(event, context, callback);
  } else {
    if (server) {
      return server(event, context, callback);
    } else waitForServer(event, context, callback);
  }
};
