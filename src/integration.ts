import type { Integration, EventProcessor, Hub, Event } from '@sentry/types';

import { logger } from '@sentry/utils';
import { maybeRemoveProfileFromSdkMetadata, createProfilingEventEnvelope, isProfiledTransactionEvent } from './utils';

const INTEGRATION_NAME = 'ProfilingIntegration';

export class ProfilingIntegration implements Integration {
  name = INTEGRATION_NAME;
  getCurrentHub?: () => Hub = undefined;

  setupOnce(addGlobalEventProcessor: (callback: EventProcessor) => void, getCurrentHub: () => Hub): void {
    this.getCurrentHub = getCurrentHub;
    addGlobalEventProcessor(this.handleGlobalEvent.bind(this));
  }

  handleGlobalEvent(event: Event): Event {
    if (isProfiledTransactionEvent(event) && this.getCurrentHub !== undefined) {
      // Client, Dsn and Transport are all required to be able to send the profiling event to Sentry.
      // If either of them is not available, we remove the profile from the transaction event.
      // and forward it to the next event processor.
      const hub = this.getCurrentHub();

      const client = hub.getClient();
      if (!client) {
        logger.log(
          '[Profiling] getClient did not return a Client, removing profile from event and forwarding to next event processors.'
        );
        return maybeRemoveProfileFromSdkMetadata(event);
      }

      const dsn = client.getDsn();
      if (!dsn) {
        logger.log(
          '[Profiling] getDsn did not return a Dsn, removing profile from event and forwarding to next event processors.'
        );
        return maybeRemoveProfileFromSdkMetadata(event);
      }

      const transport = client.getTransport();
      if (!transport) {
        logger.log(
          '[Profiling] getTransport did not return a Transport, removing profile from event and forwarding to next event processors.'
        );
        return maybeRemoveProfileFromSdkMetadata(event);
      }

      // If all required components are available, we construct a profiling event envelope and send it to Sentry.
      logger.log('[Profiling] Preparing envelope and sending a profiling event.');
      transport.send(createProfilingEventEnvelope(event, dsn, client.getOptions()._metadata));
    }

    // Ensure sdkProcessingMetadata["profile"] is removed from the event before forwarding it to the next event processor.
    return maybeRemoveProfileFromSdkMetadata(event);
  }
}
