/**
 * Типы для Yandex Maps API
 */
declare namespace ymaps {
    function ready(callback: () => void): void;
    function geocode(request: string, options?: any): Promise<any>;
    const modules: {
        require(modules: string[], successCallback: Function, errorCallback?: Function): void;
    };

    class Map {
        constructor(element: string | HTMLElement, options: MapOptions);
        geoObjects: GeoObjectCollection;
        setCenter(center: number[], zoom?: number): void;
        getZoom(): number;
        setZoom(zoom: number): void;
        controls: any;
        behaviors: any;
        events: EventManager;
        balloon: any;
        hint: any;
        action: any;
    }

    class Placemark {
        constructor(
            coordinates: number[],
            properties?: any,
            options?: any
        );
        geometry: {
            setCoordinates(coordinates: number[]): void;
            getCoordinates(): number[];
            getType(): string;
        };
        properties: {
            set(key: string, value: any): void;
            get(key: string): any;
        };
        options: {
            set(key: string, value: any): void;
            get(key: string): any;
        };
        events: EventManager;
    }

    class SuggestView {
        constructor(element: string | HTMLElement, options?: any);
        events: EventManager;
        state: any;
    }

    interface MapOptions {
        center: number[];
        zoom: number;
        controls?: string[];
        behaviors?: string[];
        type?: string;
        restrictMapArea?: boolean | number[][];
    }

    interface GeoObjectCollection {
        add(object: any): this;
        remove(object: any): this;
        get(index: number): any;
        getLength(): number;
        each(callback: (object: any) => void): void;
        getAll(): any[];
    }

    interface EventManager {
        add(type: string | string[], callback: (event: any) => void, context?: any, priority?: number): this;
        remove(type: string | string[], callback: (event: any) => void, context?: any, priority?: number): this;
        fire(type: string, event?: any, defaultFn?: Function): this;
        getParent(): EventManager | null;
    }

    class Clusterer {
        constructor(options?: any);
        add(geoObjects: any | any[]): this;
        remove(geoObjects: any | any[]): this;
        getGeoObjects(): any[];
        getClusters(): any[];
        getBounds(): number[][] | null;
        getObjectState(geoObject: any): { isClustered: boolean, cluster: any, isShown: boolean };
    }

    class Circle {
        constructor(coordinates: number[], radius: number, properties?: any, options?: any);
    }
}

interface Window {
    ymaps: typeof ymaps;
}
