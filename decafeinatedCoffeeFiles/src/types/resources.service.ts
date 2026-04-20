/**
 * Placeholder interface for refactoring .coffee files into modern JS framework.
 * Can be extended as needed.
 */
export interface ResourcesService {
    getResourceUrl(): string;
    getResourceType(): string;
    getResourceName(): string;
    getResourceId(): number;
}