const noop = () => {};

const logger = {
  info: noop,
  error: noop,
  warn: noop,
  debug: noop,
};

export default logger;
