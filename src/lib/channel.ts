import client, { Connection, amqp, assert } from './internal';

export class Channel {
    channel: amqp.ConfirmChannel | null = null;
    private prefetchCount: number;

    constructor(public connection: Connection) { }

    async initialize() {
        if (this.isInitialized()) {
            await this.close();
        }

        assert(this.connection.isConnected());

        const channel = await this.connection.connection!.createConfirmChannel();

        channel.once('error', (err: Error) => {
            this.channel = null;
            client.reportError('channel', err);
        });

        channel.once('close', () => {
            this.channel = null;
            client.reportError('channel', new Error(`Channel closed`));
        });

        this.channel = channel;
    }

    async close() {
        if (!this.isInitialized()) {
            return;
        }

        const channel = this.channel!;
        this.channel = null;

        channel.removeAllListeners('error');
        channel.removeAllListeners('close');

        await channel.close()
            .catch(err => console.error(`Channel close failed with error:`, err));
    }

    isInitialized() {
        return !!this.channel;
    }

    async prefetch(count: number) {
        if (!this.isInitialized()) {
            throw new Error(`Channel is not initialized`);
        }

        if (this.prefetchCount === count) {
            return;
        }

        await this.channel!.prefetch(count);

        this.prefetchCount = count;
    }
}
