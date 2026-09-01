export default () => ({
  appName: "StockFlow",
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3001),
  mongodbUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/stockflow",
});
