export class FlowPublicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlowPublicationError';
  }
}
