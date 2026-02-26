import * as mediasoup from "mediasoup";

// ─── Configuration ──────────────────────────────────────
const WORKER_SETTINGS: mediasoup.types.WorkerSettings = {
    logLevel: "warn",
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
};

// Media codecs the router will support.
const MEDIA_CODECS: mediasoup.types.RtpCodecCapability[] = [
    {
        kind: "audio" as mediasoup.types.MediaKind,
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: "video" as mediasoup.types.MediaKind,
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {
            "x-google-start-bitrate": 1000,
        },
    },
] as any;

// WebRTC transport options
const TRANSPORT_OPTIONS = {
    listenInfos: [
        {
            protocol: "udp" as const,
            ip: "0.0.0.0",
            announcedAddress: "127.0.0.1",
        },
        {
            protocol: "tcp" as const,
            ip: "0.0.0.0",
            announcedAddress: "127.0.0.1",
        },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
};

// ─── Types ──────────────────────────────────────────────
export interface TransportParams {
    id: string;
    iceParameters: any;
    iceCandidates: any[];
    dtlsParameters: any;
}

export interface ProducerInfo {
    producerId: string;
    peerId: string;
    userId: string;
    kind: string;
}

interface PeerTransports {
    sendTransport?: mediasoup.types.WebRtcTransport;
    recvTransport?: mediasoup.types.WebRtcTransport;
    producers: Map<string, mediasoup.types.Producer>;
    consumers: Map<string, mediasoup.types.Consumer>;
}

// ─── SFU Service ────────────────────────────────────────
export class SFUService {
    private worker: mediasoup.types.Worker | null = null;
    private routers: Map<string, mediasoup.types.Router> = new Map();
    private peerTransports: Map<string, PeerTransports> = new Map();

    async init(): Promise<void> {
        this.worker = await mediasoup.createWorker(WORKER_SETTINGS);
        console.log("mediasoup: Worker created (pid:", this.worker.pid, ")");

        this.worker.on("died", () => {
            console.error("mediasoup: Worker died! Restarting...");
            setTimeout(() => this.init(), 2000);
        });
    }

    async getOrCreateRouter(roomId: string): Promise<mediasoup.types.Router> {
        if (this.routers.has(roomId)) {
            return this.routers.get(roomId)!;
        }

        if (!this.worker) throw new Error("mediasoup worker not initialized");

        const router = await this.worker.createRouter({ mediaCodecs: MEDIA_CODECS });
        this.routers.set(roomId, router);
        console.log(`mediasoup: Router created for room ${roomId}`);
        return router;
    }

    getRouterCapabilities(roomId: string): mediasoup.types.RtpCapabilities | null {
        const router = this.routers.get(roomId);
        return router ? router.rtpCapabilities : null;
    }

    async createTransport(
        roomId: string,
        peerId: string,
        direction: "send" | "recv"
    ): Promise<TransportParams> {
        const router = this.routers.get(roomId);
        if (!router) throw new Error("Router not found for room " + roomId);

        const transport = await router.createWebRtcTransport(TRANSPORT_OPTIONS);

        if (!this.peerTransports.has(peerId)) {
            this.peerTransports.set(peerId, {
                producers: new Map(),
                consumers: new Map(),
            });
        }

        const peer = this.peerTransports.get(peerId)!;
        if (direction === "send") {
            peer.sendTransport = transport;
        } else {
            peer.recvTransport = transport;
        }

        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        };
    }

    async connectTransport(
        peerId: string,
        transportId: string,
        dtlsParameters: any
    ): Promise<void> {
        const transport = this.findTransport(peerId, transportId);
        if (!transport) throw new Error("Transport not found");
        await transport.connect({ dtlsParameters });
    }

    async produce(
        peerId: string,
        transportId: string,
        kind: mediasoup.types.MediaKind,
        rtpParameters: mediasoup.types.RtpParameters,
        appData: any = {}
    ): Promise<string> {
        const transport = this.findTransport(peerId, transportId);
        if (!transport) throw new Error("Send transport not found");

        const producer = await transport.produce({ kind, rtpParameters, appData });
        const peer = this.peerTransports.get(peerId)!;
        peer.producers.set(producer.id, producer);

        producer.on("transportclose", () => {
            peer.producers.delete(producer.id);
        });

        return producer.id;
    }

    async consume(
        roomId: string,
        consumerPeerId: string,
        producerId: string,
        rtpCapabilities: mediasoup.types.RtpCapabilities
    ) {
        const router = this.routers.get(roomId);
        if (!router) {
            console.warn("mediasoup consume: No router for room", roomId);
            return null;
        }

        if (!router.canConsume({ producerId, rtpCapabilities })) {
            console.warn("mediasoup consume: canConsume=false", { producerId, roomId, consumerPeerId });
            return null;
        }

        const peer = this.peerTransports.get(consumerPeerId);
        if (!peer) {
            console.warn("mediasoup consume: No peer entry for", consumerPeerId);
            return null;
        }
        // Find the producer and its owner
        let producer: mediasoup.types.Producer | undefined;
        for (const p of this.peerTransports.values()) {
            producer = p.producers.get(producerId);
            if (producer) break;
        }

        if (!producer) {
            console.error("Producer not found for consumption:", producerId);
            return null;
        }

        if (!peer.recvTransport) {
            console.warn("mediasoup consume: No recv transport for peer", consumerPeerId, "— has send?", !!peer.sendTransport);
            return null;
        }

        const consumer = await peer.recvTransport.consume({
            producerId,
            rtpCapabilities,
            paused: false,
        });

        peer.consumers.set(consumer.id, consumer);

        consumer.on("transportclose", () => {
            peer.consumers.delete(consumer.id);
        });
        consumer.on("producerclose", () => {
            peer.consumers.delete(consumer.id);
        });

        return {
            id: consumer.id,
            producerId: consumer.producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            appData: producer.appData,
        };
    }

    getAllProducersForPeer(peerId: string): { producerId: string; kind: string }[] {
        const peer = this.peerTransports.get(peerId);
        if (!peer) return [];
        return Array.from(peer.producers.entries()).map(([id, p]) => ({
            producerId: id,
            kind: p.kind,
        }));
    }

    async closeProducer(peerId: string, producerId: string): Promise<void> {
        const peer = this.peerTransports.get(peerId);
        if (!peer) return;

        const producer = peer.producers.get(producerId);
        if (producer) {
            producer.close();
            peer.producers.delete(producerId);
        }
    }

    closePeer(peerId: string): string[] {
        const peer = this.peerTransports.get(peerId);
        if (!peer) return [];

        const producerIds = Array.from(peer.producers.keys());

        for (const producer of peer.producers.values()) producer.close();
        for (const consumer of peer.consumers.values()) consumer.close();
        peer.sendTransport?.close();
        peer.recvTransport?.close();

        this.peerTransports.delete(peerId);
        return producerIds;
    }

    closeRoom(roomId: string): void {
        const router = this.routers.get(roomId);
        if (router) {
            router.close();
            this.routers.delete(roomId);
            console.log(`mediasoup: Router closed for room ${roomId}`);
        }
    }

    private findTransport(
        peerId: string,
        transportId: string
    ): mediasoup.types.WebRtcTransport | null {
        const peer = this.peerTransports.get(peerId);
        if (!peer) return null;
        if (peer.sendTransport?.id === transportId) return peer.sendTransport;
        if (peer.recvTransport?.id === transportId) return peer.recvTransport;
        return null;
    }
}

export const sfuService = new SFUService();
