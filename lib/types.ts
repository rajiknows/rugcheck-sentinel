export interface InsiderGraph {
    nodes: Array<{
        id: string;
        participant: boolean;
        holdings: number;
    }>;
    edges: Array<{ source: string; target: string }>;
}
