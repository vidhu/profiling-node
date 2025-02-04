const Sentry = require('@sentry/node');
require('@sentry/tracing');
require('../../lib/index.js');

const { benchmark, fibonacci } = require('./utils');

const transport = () => {
  return {
    send: (event) => {
      // Void this so we dont end up benchmarking it
      return Promise.resolve();
    },
    flush: () => {
      // Void this so we dont end up benchmarking it
      return Promise.resolve();
    }
  };
};

Sentry.init({
  dsn: 'https://7fa19397baaf433f919fbe02228d5470@o1137848.ingest.sentry.io/6625302',
  tracesSampleRate: 1,
  transport
});

// Benchmarking profiled transaction
benchmark('transaction - base', 100, {
  run: function run() {
    const transaction = Sentry.startTransaction({ name: 'test' });
    fibonacci(32);
    transaction.finish();
  }
});
