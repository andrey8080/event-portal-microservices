import { CommonModule } from '@angular/common';
import {
    Component,
    Input,
    OnDestroy,
    OnInit,
    ChangeDetectionStrategy,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
    Subject,
    distinctUntilChanged,
    filter,
    debounceTime,
    switchMap,
    takeUntil,
    tap,
    catchError,
    of,
    map,
} from 'rxjs';
import { MapsService } from '../../../services/maps.service';
import { ProxyService } from '../../../services/proxy.service';

interface AddressSuggestion {
    id: string;
    label: string;
    value: string;
}

interface BackendGeoItem {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
    type?: string;
    precision?: string;
}

@Component({
    selector: 'app-address-input',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './address-input.component.html',
    styleUrls: ['./address-input.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressInputComponent implements OnInit, OnDestroy {
    @Input({ required: true }) form!: FormGroup;

    @Input() addressControlName = 'address';
    @Input() latitudeControlName = 'latitude';
    @Input() longitudeControlName = 'longitude';

    @Input() label = 'Адрес';
    @Input() placeholder = 'Начните вводить адрес (улица, дом, город)';
    @Input() enableMapPreview = true;
    @Input() mapHeight = 250;

    suggestions: AddressSuggestion[] = [];
    isLoading = false;
    showDropdown = false;

    private mapElementId = `map-preview-${Math.random().toString(36).slice(2)}`;
    private map: any;
    private placemark: any;
    private mapInitialized = false;
    private mapInitPromise: Promise<void> | null = null;
    private pendingMapUpdate: { address: string; lat: number; lng: number } | null = null;

    private updatingFromSelection = false;
    private userTyped = false;
    private suggestSeq = 0;
    private resolveSeq = 0;
    private destroy$ = new Subject<void>();

    constructor(
        private mapsService: MapsService,
        private proxyService: ProxyService,
    ) { }

    ngOnInit(): void {
        const addressControl = this.form.get(this.addressControlName);
        const latitudeControl = this.form.get(this.latitudeControlName);
        const longitudeControl = this.form.get(this.longitudeControlName);

        if (!addressControl) {
            throw new Error(
                `AddressInputComponent: form control "${this.addressControlName}" not found`
            );
        }
        if (!latitudeControl) {
            throw new Error(
                `AddressInputComponent: form control "${this.latitudeControlName}" not found`
            );
        }
        if (!longitudeControl) {
            throw new Error(
                `AddressInputComponent: form control "${this.longitudeControlName}" not found`
            );
        }

        addressControl.valueChanges
            .pipe(
                takeUntil(this.destroy$),
                tap(() => {
                    if (this.updatingFromSelection) {
                        this.updatingFromSelection = false;
                        return;
                    }

                    // Координаты нужно сбрасывать только при ручном вводе.
                    // Иначе при patchValue() (например, загрузка события на редактирование)
                    // мы бы затирали lat/lng.
                    if (this.userTyped) {
                        this.userTyped = false;

                        // Сбрасываем координаты без emitEvent, чтобы не дергать обновление карты.
                        // Пустая строка -> Number('') === 0, из-за чего карта улетает в (0,0) ("в море").
                        latitudeControl.setValue(null, { emitEvent: false });
                        longitudeControl.setValue(null, { emitEvent: false });

                        if (addressControl.hasError('addressNotResolved')) {
                            const { addressNotResolved, ...rest } = addressControl.errors || {};
                            addressControl.setErrors(Object.keys(rest).length ? rest : null);
                        }
                    }
                }),
                debounceTime(500),
                distinctUntilChanged(),
                filter((value) => typeof value === 'string'),
                switchMap((value) => {
                    const query = (value as string).trim();
                    if (query.length < 3) {
                        this.suggestions = [];
                        this.isLoading = false;
                        return of([] as AddressSuggestion[]);
                    }

                    this.isLoading = true;
                    this.suggestions = [];

                    const seq = ++this.suggestSeq;

                    return this.proxyService.suggestAddress(query, 5).pipe(
                        map((payload) => ({ seq, payload })),
                        catchError(() => of({ seq, payload: { results: [] as any[] } }))
                    );
                })
            )
            .subscribe((result: any) => {
                // Если пришёл устаревший ответ (пользователь уже изменил ввод) — игнорируем.
                if (!result || typeof result !== 'object' || result.seq !== this.suggestSeq) {
                    return;
                }

                const payload = result.payload;
                const items = (payload?.results || []) as any[];
                this.suggestions = items
                    .map((it) => ({
                        id: (it?.id || it?.uri || it?.text || '').toString(),
                        label: (it?.text || it?.label || '').toString(),
                        value: (it?.text || it?.label || '').toString(),
                    }))
                    .filter((s) => !!s.id && !!s.label && !!s.value)
                    .slice(0, 5);

                this.isLoading = false;
            });

        // Если координаты выставили программно (patchValue) — обновим карту
        const tryUpdateMapFromControls = () => {
            if (!this.enableMapPreview) return;
            const latRaw = latitudeControl.value;
            const lngRaw = longitudeControl.value;
            if (latRaw === null || latRaw === '' || typeof latRaw === 'undefined') return;
            if (lngRaw === null || lngRaw === '' || typeof lngRaw === 'undefined') return;

            const lat = Number(latRaw);
            const lng = Number(lngRaw);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            const address = (addressControl.value || '').toString();
            this.updateMap(address, lat, lng);
        };

        latitudeControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => tryUpdateMapFromControls());
        longitudeControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => tryUpdateMapFromControls());

        // Инициализируем карту один раз
        if (this.enableMapPreview) {
            setTimeout(() => {
                const lat = Number(latitudeControl.value);
                const lng = Number(longitudeControl.value);
                const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
                const address = (addressControl.value || '').toString();

                // Если координат нет — инициализируем карту на дефолтном центре,
                // но любые актуальные координаты (из выбора подсказки) применим сразу после готовности.
                const initLat = hasCoords ? lat : 59.9343;
                const initLng = hasCoords ? lng : 30.3351;
                const initAddress = address?.trim() ? address : 'Санкт-Петербург';
                this.ensureMapInitialized(initAddress, initLat, initLng);
            }, 0);
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();

        if (this.enableMapPreview && this.mapInitialized && this.map) {
            this.mapsService.destroyMap(this.mapElementId, this.map);
        }
    }

    getMapElementId(): string {
        return this.mapElementId;
    }

    onUserInput(): void {
        this.userTyped = true;
        this.showDropdown = true;
    }

    select(suggestion: AddressSuggestion): void {
        const id = (suggestion?.id || '').toString().trim();
        const addressText = (suggestion?.value || suggestion?.label || '').toString().trim();
        if (!id || !addressText) return;

        const addressControl = this.form.get(this.addressControlName);
        if (addressControl) {
            this.updatingFromSelection = true;
            addressControl.setValue(addressText, { emitEvent: false });
            addressControl.markAsTouched();
        }

        this.suggestions = [];
        this.showDropdown = false;

        this.resolveById(id, addressText);
    }

    private resolveById(id: string, fallbackAddress: string): void {
        const addressControl = this.form.get(this.addressControlName);
        const seq = ++this.resolveSeq;

        this.isLoading = true;
        this.proxyService
            .geocodeById(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (payload: any) => {
                    if (seq !== this.resolveSeq) return;
                    const items = (payload?.results || []) as BackendGeoItem[];
                    if (items.length > 0 && Number.isFinite(Number(items[0].lat)) && Number.isFinite(Number(items[0].lng))) {
                        const best = items[0];
                        this.applyResolved((best.address || best.name || fallbackAddress).toString(), Number(best.lat), Number(best.lng));
                        return;
                    }

                    if (addressControl) {
                        addressControl.setErrors({
                            ...(addressControl.errors || {}),
                            addressNotResolved: true,
                        });
                    }
                },
                error: () => {
                    if (seq !== this.resolveSeq) return;
                    if (addressControl) {
                        addressControl.setErrors({
                            ...(addressControl.errors || {}),
                            addressNotResolved: true,
                        });
                    }
                },
                complete: () => {
                    if (seq !== this.resolveSeq) return;
                    this.isLoading = false;
                }
            });
    }

    private applyResolved(address: string, lat: number, lng: number): void {
        const addressControl = this.form.get(this.addressControlName);
        const latitudeControl = this.form.get(this.latitudeControlName);
        const longitudeControl = this.form.get(this.longitudeControlName);

        if (!addressControl || !latitudeControl || !longitudeControl) return;

        this.updatingFromSelection = true;

        addressControl.setValue(address, { emitEvent: false });
        latitudeControl.setValue(lat);
        longitudeControl.setValue(lng);

        addressControl.markAsTouched();

        // Убираем ошибку "не подтверждён адрес" если была
        if (addressControl.hasError('addressNotResolved')) {
            const { addressNotResolved, ...rest } = addressControl.errors || {};
            addressControl.setErrors(Object.keys(rest).length ? rest : null);
        }

        this.suggestions = [];
        this.showDropdown = false;

        this.updateMap(address, lat, lng);
    }

    onEnter(event: KeyboardEvent): void {
        // На Enter подтверждаем ввод адреса (и не даём форме случайно отправиться до резолва координат)
        event.preventDefault();

        if (this.suggestions.length > 0) {
            this.select(this.suggestions[0]);
            return;
        }
    }

    onBlur(): void {
        // Даем шанс клику по подсказке отработать до blur
        setTimeout(() => {
            this.showDropdown = false;

            const addressControl = this.form.get(this.addressControlName);
            const latitudeControl = this.form.get(this.latitudeControlName);
            const longitudeControl = this.form.get(this.longitudeControlName);

            if (!addressControl || !latitudeControl || !longitudeControl) return;

            const address = (addressControl.value || '').toString().trim();
            const lat = Number(latitudeControl.value);
            const lng = Number(longitudeControl.value);
            const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

            if (!address) return;

            // Если координаты уже есть — адрес валиден
            if (hasCoords) return;

            // Best-practice: не геокодим без выбора подсказки.
            // Попробуем получить подсказки и, если есть единственный вариант, автоселектнем его.
            this.isLoading = true;
            const seq = ++this.resolveSeq;
            this.proxyService
                .suggestAddress(address, 5)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (payload: any) => {
                        if (seq !== this.resolveSeq) return;

                        const items = (payload?.results || []) as any[];
                        const suggestions = items
                            .map((it) => ({
                                id: (it?.id || it?.uri || it?.text || '').toString(),
                                label: (it?.text || it?.label || '').toString(),
                                value: (it?.text || it?.label || '').toString(),
                            }))
                            .filter((s) => !!s.id && !!s.label && !!s.value)
                            .slice(0, 5);

                        if (suggestions.length === 1) {
                            this.select(suggestions[0]);
                            return;
                        }

                        if (suggestions.length > 1) {
                            this.suggestions = suggestions;
                            this.showDropdown = true;
                        }

                        addressControl.setErrors({
                            ...(addressControl.errors || {}),
                            addressNotResolved: true,
                        });
                    },
                    error: () => {
                        if (seq !== this.resolveSeq) return;
                        addressControl.setErrors({
                            ...(addressControl.errors || {}),
                            addressNotResolved: true,
                        });
                    },
                    complete: () => {
                        if (seq !== this.resolveSeq) return;
                        this.isLoading = false;
                    }
                });
        }, 150);
    }

    private updateMap(address: string, lat: number, lng: number): void {
        if (!this.enableMapPreview) return;

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        // Быстрое обновление существующей карты (без пересоздания)
        try {
            if (this.mapInitialized && this.map && typeof this.map.setCenter === 'function') {
                this.applyMapPosition(address, lat, lng);
                return;
            }
        } catch {
            // ignore
        }

        // Если карта ещё инициализируется — сохраним обновление и применим позже.
        if (this.mapInitPromise) {
            this.pendingMapUpdate = { address, lat, lng };
            return;
        }

        // Фолбэк: пересоздание карты
        if (this.mapInitialized && this.map) {
            this.mapsService.destroyMap(this.mapElementId, this.map);
            this.map = undefined;
            this.placemark = undefined;
            this.mapInitialized = false;
        }

        this.ensureMapInitialized(address, lat, lng);
    }

    private ensureMapInitialized(address: string, lat: number, lng: number): void {
        if (!this.enableMapPreview) return;
        if (this.mapInitialized && this.map) {
            this.applyMapPosition(address, lat, lng);
            return;
        }

        if (this.mapInitPromise) {
            this.pendingMapUpdate = { address, lat, lng };
            return;
        }

        this.mapInitPromise = this.mapsService
            .createMap(this.mapElementId, address, lat, lng)
            .then((mapData) => {
                this.map = mapData.map;
                this.placemark = mapData.placemark;
                this.mapInitialized = true;

                // Применим последнее запрошенное положение, если за время инициализации оно поменялось.
                if (this.pendingMapUpdate) {
                    const pending = this.pendingMapUpdate;
                    this.pendingMapUpdate = null;
                    this.applyMapPosition(pending.address, pending.lat, pending.lng);
                }
            })
            .catch(() => {
                // Не блокируем форму
            })
            .finally(() => {
                this.mapInitPromise = null;
            });
    }

    private applyMapPosition(address: string, lat: number, lng: number): void {
        if (!this.map || typeof this.map.setCenter !== 'function') return;

        this.map.setCenter([lat, lng], 15);
        if (this.placemark?.geometry?.setCoordinates) {
            this.placemark.geometry.setCoordinates([lat, lng]);
        }
        if (this.placemark?.properties?.set) {
            this.placemark.properties.set('balloonContent', address);
        }
    }
}
