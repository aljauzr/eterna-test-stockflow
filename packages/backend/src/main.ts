import "reflect-metadata";
import {
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

function mapValidationErrors(errors: ValidationError[]) {
  return errors.reduce<Record<string, string[]>>((accumulator, error) => {
    const messages = error.constraints ? Object.values(error.constraints) : [];
    if (messages.length > 0) {
      accumulator[error.property] = messages;
    }

    if (error.children && error.children.length > 0) {
      Object.assign(accumulator, mapValidationErrors(error.children));
    }

    return accumulator;
  }, {});
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new UnprocessableEntityException({
          message: "Validation failed",
          errors: mapValidationErrors(errors),
        }),
    }),
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`StockFlow backend listening on http://localhost:${port}/api`);
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to bootstrap backend", error);
  process.exit(1);
});
