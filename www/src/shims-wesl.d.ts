declare module "*.wesl?static" {
  const value: string;
  export default value;
}

declare module "*.wesl?link" {
  const value: unknown;
  export default value;
}
