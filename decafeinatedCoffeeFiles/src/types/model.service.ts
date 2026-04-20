/**
 * Placeholder interface for refactoring .coffee files into modern JS framework.
 * Can be extended as needed.
 */
export interface ModelService {
    getModelUrl(): string;
    getModelType(): string;
    getModelName(): string;
    getModelId(): number;
}