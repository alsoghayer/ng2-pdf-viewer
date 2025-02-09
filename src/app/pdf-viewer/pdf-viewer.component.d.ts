/**
 * Created by vadimdez on 21/06/16.
 */
import { ElementRef, EventEmitter, OnChanges, SimpleChanges, OnInit, OnDestroy, AfterViewChecked } from '@angular/core';
import { PDFSource } from 'pdfjs-dist/build/pdf';
export declare enum RenderTextMode {
    DISABLED = 0,
    ENABLED = 1,
    ENHANCED = 2
}
export declare class PdfViewerComponent implements OnChanges, OnInit, OnDestroy, AfterViewChecked {
    private element;
    static CSS_UNITS: number;
    static BORDER_WIDTH: number;
    pdfViewerContainer: any;
    private isVisible;
    private pdfMultiPageViewer;
    private pdfMultiPageLinkService;
    private pdfMultiPageFindController;
    private pdfSinglePageViewer;
    private pdfSinglePageLinkService;
    private pdfSinglePageFindController;
    private _cMapsUrl;
    private _renderText;
    private _renderTextMode;
    private _stickToPage;
    private _originalSize;
    private _pdf;
    private _page;
    private _zoom;
    private _zoomScale;
    private _rotation;
    private _showAll;
    private _canAutoResize;
    private _fitToPage;
    private _externalLinkTarget;
    private _showBorders;
    private lastLoaded;
    private _latestScrolledPage;
    private resizeTimeout;
    private pageScrollTimeout;
    private isInitialized;
    private loadingTask;
    private destroy$;
    afterLoadComplete: EventEmitter<any>;
    pageRendered: EventEmitter<CustomEvent<any>>;
    pageInitialized: EventEmitter<CustomEvent<any>>;
    textLayerRendered: EventEmitter<CustomEvent<any>>;
    onError: EventEmitter<any>;
    onProgress: EventEmitter<any>;
    pageChange: EventEmitter<number>;
    src: string | Uint8Array | PDFSource;
    set cMapsUrl(cMapsUrl: string);
    set page(_page: any);
    set renderText(renderText: boolean);
    set renderTextMode(renderTextMode: RenderTextMode);
    set originalSize(originalSize: boolean);
    set showAll(value: boolean);
    set stickToPage(value: boolean);
    set zoom(value: number);
    get zoom(): number;
    set zoomScale(value: 'page-height' | 'page-fit' | 'page-width');
    get zoomScale(): 'page-height' | 'page-fit' | 'page-width';
    set rotation(value: number);
    set externalLinkTarget(value: string);
    set autoresize(value: boolean);
    set fitToPage(value: boolean);
    set showBorders(value: boolean);
    static getLinkTarget(type: string): any;
    constructor(element: ElementRef);
    ngAfterViewChecked(): void;
    ngOnInit(): void;
    ngOnDestroy(): void;
    onPageResize(): void;
    get pdfLinkService(): any;
    get pdfViewer(): any;
    get pdfFindController(): any;
    ngOnChanges(changes: SimpleChanges): void;
    updateSize(): void;
    clear(): void;
    private getPDFLinkServiceConfig;
    private setupMultiPageViewer;
    private setupSinglePageViewer;
    private getValidPageNumber;
    private getDocumentParams;
    private loadPDF;
    private update;
    private render;
    private getScale;
    private getCurrentViewer;
    private resetPdfDocument;
}
