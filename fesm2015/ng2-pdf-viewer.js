import { EventEmitter, Component, ElementRef, ViewChild, Output, Input, HostListener, NgModule } from '@angular/core';
import { fromEvent, Subject, from } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as PDFJS from 'pdfjs-dist/build/pdf';
export { PDFDocumentProxy, PDFJSStatic, PDFPageProxy, PDFProgressData, PDFPromise, PDFSource, PDFViewerParams } from 'pdfjs-dist/build/pdf';
import * as PDFJSViewer from 'pdfjs-dist/web/pdf_viewer';

function createEventBus(pdfJsViewer, destroy$) {
    const globalEventBus = new pdfJsViewer.EventBus();
    attachDOMEventsToEventBus(globalEventBus, destroy$);
    return globalEventBus;
}
function attachDOMEventsToEventBus(eventBus, destroy$) {
    fromEvent(eventBus, 'documentload')
        .pipe(takeUntil(destroy$))
        .subscribe(() => {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent('documentload', true, true, {});
        window.dispatchEvent(event);
    });
    fromEvent(eventBus, 'pagerendered')
        .pipe(takeUntil(destroy$))
        .subscribe(({ pageNumber, cssTransform, source }) => {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent('pagerendered', true, true, {
            pageNumber,
            cssTransform,
        });
        source.div.dispatchEvent(event);
    });
    fromEvent(eventBus, 'textlayerrendered')
        .pipe(takeUntil(destroy$))
        .subscribe(({ pageNumber, source }) => {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent('textlayerrendered', true, true, { pageNumber });
        source.textLayerDiv.dispatchEvent(event);
    });
    fromEvent(eventBus, 'pagechanging')
        .pipe(takeUntil(destroy$))
        .subscribe(({ pageNumber, source }) => {
        const event = document.createEvent('UIEvents');
        event.initEvent('pagechanging', true, true);
        /* tslint:disable:no-string-literal */
        event['pageNumber'] = pageNumber;
        source.container.dispatchEvent(event);
    });
    fromEvent(eventBus, 'pagesinit')
        .pipe(takeUntil(destroy$))
        .subscribe(({ source }) => {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent('pagesinit', true, true, null);
        source.container.dispatchEvent(event);
    });
    fromEvent(eventBus, 'pagesloaded')
        .pipe(takeUntil(destroy$))
        .subscribe(({ pagesCount, source }) => {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent('pagesloaded', true, true, { pagesCount });
        source.container.dispatchEvent(event);
    });
    fromEvent(eventBus, 'scalechange')
        .pipe(takeUntil(destroy$))
        .subscribe(({ scale, presetValue, source }) => {
        const event = document.createEvent('UIEvents');
        event.initEvent('scalechange', true, true);
        /* tslint:disable:no-string-literal */
        event['scale'] = scale;
        /* tslint:disable:no-string-literal */
        event['presetValue'] = presetValue;
        source.container.dispatchEvent(event);
    });
    fromEvent(eventBus, 'updateviewarea')
        .pipe(takeUntil(destroy$))
        .subscribe(({ location, source }) => {
        const event = document.createEvent('UIEvents');
        event.initEvent('updateviewarea', true, true);
        event['location'] = location;
        source.container.dispatchEvent(event);
    });
    fromEvent(eventBus, 'find')
        .pipe(takeUntil(destroy$))
        .subscribe(({ source, type, query, phraseSearch, caseSensitive, highlightAll, findPrevious, }) => {
        if (source === window) {
            return; // event comes from FirefoxCom, no need to replicate
        }
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent('find' + type, true, true, {
            query,
            phraseSearch,
            caseSensitive,
            highlightAll,
            findPrevious,
        });
        window.dispatchEvent(event);
    });
    fromEvent(eventBus, 'attachmentsloaded')
        .pipe(takeUntil(destroy$))
        .subscribe(({ attachmentsCount, source }) => {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent('attachmentsloaded', true, true, {
            attachmentsCount,
        });
        source.container.dispatchEvent(event);
    });
    fromEvent(eventBus, 'sidebarviewchanged')
        .pipe(takeUntil(destroy$))
        .subscribe(({ view, source }) => {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent('sidebarviewchanged', true, true, { view });
        source.outerContainer.dispatchEvent(event);
    });
    fromEvent(eventBus, 'pagemode')
        .pipe(takeUntil(destroy$))
        .subscribe(({ mode, source }) => {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent('pagemode', true, true, { mode });
        source.pdfViewer.container.dispatchEvent(event);
    });
    fromEvent(eventBus, 'namedaction')
        .pipe(takeUntil(destroy$))
        .subscribe(({ action, source }) => {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent('namedaction', true, true, { action });
        source.pdfViewer.container.dispatchEvent(event);
    });
    fromEvent(eventBus, 'presentationmodechanged')
        .pipe(takeUntil(destroy$))
        .subscribe(({ active, switchInProgress }) => {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent('presentationmodechanged', true, true, {
            active,
            switchInProgress,
        });
        window.dispatchEvent(event);
    });
    fromEvent(eventBus, 'outlineloaded')
        .pipe(takeUntil(destroy$))
        .subscribe(({ outlineCount, source }) => {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent('outlineloaded', true, true, { outlineCount });
        source.container.dispatchEvent(event);
    });
}

function assign(obj, prop, value) {
    obj[prop] = value;
}
function isSSR() {
    return typeof window === 'undefined';
}

/**
 * Created by vadimdez on 21/06/16.
 */
if (!isSSR()) {
    assign(PDFJS, "verbosity", PDFJS.VerbosityLevel.ERRORS);
}
var RenderTextMode;
(function (RenderTextMode) {
    RenderTextMode[RenderTextMode["DISABLED"] = 0] = "DISABLED";
    RenderTextMode[RenderTextMode["ENABLED"] = 1] = "ENABLED";
    RenderTextMode[RenderTextMode["ENHANCED"] = 2] = "ENHANCED";
})(RenderTextMode || (RenderTextMode = {}));
class PdfViewerComponent {
    constructor(element) {
        this.element = element;
        this.isVisible = false;
        this._cMapsUrl = typeof PDFJS !== 'undefined'
            ? `https://unpkg.com/pdfjs-dist@${PDFJS.version}/cmaps/`
            : null;
        this._renderText = true;
        this._renderTextMode = RenderTextMode.ENABLED;
        this._stickToPage = false;
        this._originalSize = true;
        this._page = 1;
        this._zoom = 1;
        this._zoomScale = 'page-width';
        this._rotation = 0;
        this._showAll = true;
        this._canAutoResize = true;
        this._fitToPage = false;
        this._externalLinkTarget = 'blank';
        this._showBorders = false;
        this.isInitialized = false;
        this.destroy$ = new Subject();
        this.afterLoadComplete = new EventEmitter();
        this.pageRendered = new EventEmitter();
        this.pageInitialized = new EventEmitter();
        this.textLayerRendered = new EventEmitter();
        this.onError = new EventEmitter();
        this.onProgress = new EventEmitter();
        this.pageChange = new EventEmitter(true);
        if (isSSR()) {
            return;
        }
        let pdfWorkerSrc;
        if (window.hasOwnProperty('pdfWorkerSrc') &&
            typeof window.pdfWorkerSrc === 'string' &&
            window.pdfWorkerSrc) {
            pdfWorkerSrc = window.pdfWorkerSrc;
        }
        else {
            pdfWorkerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS.version}/es5/build/pdf.worker.js`;
        }
        assign(PDFJS.GlobalWorkerOptions, "workerSrc", pdfWorkerSrc);
    }
    set cMapsUrl(cMapsUrl) {
        this._cMapsUrl = cMapsUrl;
    }
    set page(_page) {
        _page = parseInt(_page, 10) || 1;
        const originalPage = _page;
        if (this._pdf) {
            _page = this.getValidPageNumber(_page);
        }
        this._page = _page;
        if (originalPage !== _page) {
            this.pageChange.emit(_page);
        }
    }
    set renderText(renderText) {
        this._renderText = renderText;
    }
    set renderTextMode(renderTextMode) {
        this._renderTextMode = renderTextMode;
    }
    set originalSize(originalSize) {
        this._originalSize = originalSize;
    }
    set showAll(value) {
        this._showAll = value;
    }
    set stickToPage(value) {
        this._stickToPage = value;
    }
    set zoom(value) {
        if (value <= 0) {
            return;
        }
        this._zoom = value;
    }
    get zoom() {
        return this._zoom;
    }
    set zoomScale(value) {
        this._zoomScale = value;
    }
    get zoomScale() {
        return this._zoomScale;
    }
    set rotation(value) {
        if (!(typeof value === 'number' && value % 90 === 0)) {
            console.warn('Invalid pages rotation angle.');
            return;
        }
        this._rotation = value;
    }
    set externalLinkTarget(value) {
        this._externalLinkTarget = value;
    }
    set autoresize(value) {
        this._canAutoResize = Boolean(value);
    }
    set fitToPage(value) {
        this._fitToPage = Boolean(value);
    }
    set showBorders(value) {
        this._showBorders = Boolean(value);
    }
    static getLinkTarget(type) {
        switch (type) {
            case 'blank':
                return PDFJS.LinkTarget.BLANK;
            case 'none':
                return PDFJS.LinkTarget.NONE;
            case 'self':
                return PDFJS.LinkTarget.SELF;
            case 'parent':
                return PDFJS.LinkTarget.PARENT;
            case 'top':
                return PDFJS.LinkTarget.TOP;
        }
        return null;
    }
    ngAfterViewChecked() {
        if (this.isInitialized) {
            return;
        }
        const offset = this.pdfViewerContainer.nativeElement.offsetParent;
        if (this.isVisible === true && offset == null) {
            this.isVisible = false;
            return;
        }
        if (this.isVisible === false && offset != null) {
            this.isVisible = true;
            setTimeout(() => {
                this.ngOnInit();
                this.ngOnChanges({ src: this.src });
            });
        }
    }
    ngOnInit() {
        if (!isSSR() && this.isVisible) {
            this.isInitialized = true;
            this.setupMultiPageViewer();
            this.setupSinglePageViewer();
        }
    }
    ngOnDestroy() {
        this.clear();
        this.destroy$.next();
        this.loadingTask = null;
    }
    onPageResize() {
        if (!this._canAutoResize || !this._pdf) {
            return;
        }
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => {
            this.updateSize();
        }, 100);
    }
    get pdfLinkService() {
        return this._showAll
            ? this.pdfMultiPageLinkService
            : this.pdfSinglePageLinkService;
    }
    get pdfViewer() {
        return this.getCurrentViewer();
    }
    get pdfFindController() {
        return this._showAll
            ? this.pdfMultiPageFindController
            : this.pdfSinglePageFindController;
    }
    ngOnChanges(changes) {
        if (isSSR() || !this.isVisible) {
            return;
        }
        if ('src' in changes) {
            this.loadPDF();
        }
        else if (this._pdf) {
            if ('renderText' in changes) {
                this.getCurrentViewer().textLayerMode = this._renderText
                    ? this._renderTextMode
                    : RenderTextMode.DISABLED;
                this.resetPdfDocument();
            }
            else if ('showAll' in changes) {
                this.resetPdfDocument();
            }
            if ('page' in changes) {
                const { page } = changes;
                if (page.currentValue === this._latestScrolledPage) {
                    return;
                }
                // New form of page changing: The viewer will now jump to the specified page when it is changed.
                // This behavior is introduced by using the PDFSinglePageViewer
                this.getCurrentViewer().scrollPageIntoView({ pageNumber: this._page });
            }
            this.update();
        }
    }
    updateSize() {
        const currentViewer = this.getCurrentViewer();
        from(this._pdf.getPage(currentViewer.currentPageNumber))
            .pipe(takeUntil(this.destroy$))
            .subscribe({
            next: (page) => {
                const rotation = this._rotation || page.rotate;
                const viewportWidth = page.getViewport({
                    scale: this._zoom,
                    rotation
                }).width * PdfViewerComponent.CSS_UNITS;
                let scale = this._zoom;
                let stickToPage = true;
                // Scale the document when it shouldn't be in original size or doesn't fit into the viewport
                if (!this._originalSize ||
                    (this._fitToPage &&
                        viewportWidth > this.pdfViewerContainer.nativeElement.clientWidth)) {
                    const viewPort = page.getViewport({ scale: 1, rotation });
                    scale = this.getScale(viewPort.width, viewPort.height);
                    stickToPage = !this._stickToPage;
                }
                currentViewer._setScale(scale, stickToPage);
            }
        });
    }
    clear() {
        if (this.loadingTask && !this.loadingTask.destroyed) {
            this.loadingTask.destroy();
        }
        if (this._pdf) {
            this._pdf.destroy();
            this._pdf = null;
            this.pdfMultiPageViewer.setDocument(null);
            this.pdfSinglePageViewer.setDocument(null);
            this.pdfMultiPageLinkService.setDocument(null, null);
            this.pdfSinglePageLinkService.setDocument(null, null);
            this.pdfMultiPageFindController.setDocument(null);
            this.pdfSinglePageFindController.setDocument(null);
        }
    }
    getPDFLinkServiceConfig() {
        const pdfLinkServiceConfig = {};
        const linkTarget = PdfViewerComponent.getLinkTarget(this._externalLinkTarget);
        if (linkTarget) {
            pdfLinkServiceConfig.externalLinkTarget = linkTarget;
        }
        return pdfLinkServiceConfig;
    }
    setupMultiPageViewer() {
        assign(PDFJS, "disableTextLayer", !this._renderText);
        const eventBus = createEventBus(PDFJSViewer, this.destroy$);
        fromEvent(eventBus, 'pagerendered')
            .pipe(takeUntil(this.destroy$))
            .subscribe((event) => {
            this.pageRendered.emit(event);
        });
        fromEvent(eventBus, 'pagesinit')
            .pipe(takeUntil(this.destroy$))
            .subscribe((event) => {
            this.pageInitialized.emit(event);
        });
        fromEvent(eventBus, 'pagechanging')
            .pipe(takeUntil(this.destroy$))
            .subscribe(({ pageNumber }) => {
            if (this.pageScrollTimeout) {
                clearTimeout(this.pageScrollTimeout);
            }
            this.pageScrollTimeout = setTimeout(() => {
                this._latestScrolledPage = pageNumber;
                this.pageChange.emit(pageNumber);
            }, 100);
        });
        fromEvent(eventBus, 'textlayerrendered')
            .pipe(takeUntil(this.destroy$))
            .subscribe((event) => {
            this.textLayerRendered.emit(event);
        });
        this.pdfMultiPageLinkService = new PDFJSViewer.PDFLinkService(Object.assign({ eventBus }, this.getPDFLinkServiceConfig()));
        this.pdfMultiPageFindController = new PDFJSViewer.PDFFindController({
            linkService: this.pdfMultiPageLinkService,
            eventBus
        });
        const pdfOptions = {
            eventBus,
            container: this.element.nativeElement.querySelector('div'),
            removePageBorders: !this._showBorders,
            linkService: this.pdfMultiPageLinkService,
            textLayerMode: this._renderText
                ? this._renderTextMode
                : RenderTextMode.DISABLED,
            findController: this.pdfMultiPageFindController
        };
        this.pdfMultiPageViewer = new PDFJSViewer.PDFViewer(pdfOptions);
        this.pdfMultiPageLinkService.setViewer(this.pdfMultiPageViewer);
        this.pdfMultiPageFindController.setDocument(this._pdf);
    }
    setupSinglePageViewer() {
        assign(PDFJS, "disableTextLayer", !this._renderText);
        const eventBus = createEventBus(PDFJSViewer, this.destroy$);
        fromEvent(eventBus, 'pagechanging')
            .pipe(takeUntil(this.destroy$))
            .subscribe(({ pageNumber }) => {
            if (pageNumber !== this._page) {
                this.page = pageNumber;
            }
        });
        fromEvent(eventBus, 'pagerendered')
            .pipe(takeUntil(this.destroy$))
            .subscribe((event) => {
            this.pageRendered.emit(event);
        });
        fromEvent(eventBus, 'pagesinit')
            .pipe(takeUntil(this.destroy$))
            .subscribe((event) => {
            this.pageInitialized.emit(event);
        });
        fromEvent(eventBus, 'textlayerrendered')
            .pipe(takeUntil(this.destroy$))
            .subscribe((event) => {
            this.textLayerRendered.emit(event);
        });
        this.pdfSinglePageLinkService = new PDFJSViewer.PDFLinkService(Object.assign({ eventBus }, this.getPDFLinkServiceConfig()));
        this.pdfSinglePageFindController = new PDFJSViewer.PDFFindController({
            linkService: this.pdfSinglePageLinkService,
            eventBus
        });
        const pdfOptions = {
            eventBus,
            container: this.element.nativeElement.querySelector('div'),
            removePageBorders: !this._showBorders,
            linkService: this.pdfSinglePageLinkService,
            textLayerMode: this._renderText
                ? this._renderTextMode
                : RenderTextMode.DISABLED,
            findController: this.pdfSinglePageFindController
        };
        this.pdfSinglePageViewer = new PDFJSViewer.PDFSinglePageViewer(pdfOptions);
        this.pdfSinglePageLinkService.setViewer(this.pdfSinglePageViewer);
        this.pdfSinglePageFindController.setDocument(this._pdf);
        this.pdfSinglePageViewer._currentPageNumber = this._page;
    }
    getValidPageNumber(page) {
        if (page < 1) {
            return 1;
        }
        if (page > this._pdf.numPages) {
            return this._pdf.numPages;
        }
        return page;
    }
    getDocumentParams() {
        const srcType = typeof this.src;
        if (!this._cMapsUrl) {
            return this.src;
        }
        const params = {
            cMapUrl: this._cMapsUrl,
            cMapPacked: true
        };
        if (srcType === 'string') {
            params.url = this.src;
        }
        else if (srcType === 'object') {
            if (this.src.byteLength !== undefined) {
                params.data = this.src;
            }
            else {
                Object.assign(params, this.src);
            }
        }
        return params;
    }
    loadPDF() {
        if (!this.src) {
            return;
        }
        if (this.lastLoaded === this.src) {
            this.update();
            return;
        }
        this.clear();
        this.loadingTask = PDFJS.getDocument(this.getDocumentParams());
        this.loadingTask.onProgress = (progressData) => {
            this.onProgress.emit(progressData);
        };
        const src = this.src;
        from(this.loadingTask.promise)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
            next: (pdf) => {
                this._pdf = pdf;
                this.lastLoaded = src;
                this.afterLoadComplete.emit(pdf);
                if (!this.pdfMultiPageViewer) {
                    this.setupMultiPageViewer();
                    this.setupSinglePageViewer();
                }
                this.resetPdfDocument();
                this.update();
            },
            error: (error) => {
                this.onError.emit(error);
            }
        });
    }
    update() {
        this.page = this._page;
        this.render();
    }
    render() {
        this._page = this.getValidPageNumber(this._page);
        const currentViewer = this.getCurrentViewer();
        if (this._rotation !== 0 ||
            currentViewer.pagesRotation !== this._rotation) {
            setTimeout(() => {
                currentViewer.pagesRotation = this._rotation;
            });
        }
        if (this._stickToPage) {
            setTimeout(() => {
                currentViewer.currentPageNumber = this._page;
            });
        }
        this.updateSize();
    }
    getScale(viewportWidth, viewportHeight) {
        const borderSize = (this._showBorders ? 2 * PdfViewerComponent.BORDER_WIDTH : 0);
        const pdfContainerWidth = this.pdfViewerContainer.nativeElement.clientWidth - borderSize;
        const pdfContainerHeight = this.pdfViewerContainer.nativeElement.clientHeight - borderSize;
        if (pdfContainerHeight === 0 || viewportHeight === 0 || pdfContainerWidth === 0 || viewportWidth === 0) {
            return 1;
        }
        let ratio = 1;
        switch (this._zoomScale) {
            case 'page-fit':
                ratio = Math.min((pdfContainerHeight / viewportHeight), (pdfContainerWidth / viewportWidth));
                break;
            case 'page-height':
                ratio = (pdfContainerHeight / viewportHeight);
                break;
            case 'page-width':
            default:
                ratio = (pdfContainerWidth / viewportWidth);
                break;
        }
        return (this._zoom * ratio) / PdfViewerComponent.CSS_UNITS;
    }
    getCurrentViewer() {
        return this._showAll ? this.pdfMultiPageViewer : this.pdfSinglePageViewer;
    }
    resetPdfDocument() {
        this.pdfFindController.setDocument(this._pdf);
        if (this._showAll) {
            this.pdfSinglePageViewer.setDocument(null);
            this.pdfSinglePageLinkService.setDocument(null);
            this.pdfMultiPageViewer.setDocument(this._pdf);
            this.pdfMultiPageLinkService.setDocument(this._pdf, null);
        }
        else {
            this.pdfMultiPageViewer.setDocument(null);
            this.pdfMultiPageLinkService.setDocument(null);
            this.pdfSinglePageViewer.setDocument(this._pdf);
            this.pdfSinglePageLinkService.setDocument(this._pdf, null);
        }
    }
}
PdfViewerComponent.CSS_UNITS = 96.0 / 72.0;
PdfViewerComponent.BORDER_WIDTH = 9;
PdfViewerComponent.decorators = [
    { type: Component, args: [{
                selector: 'pdf-viewer',
                template: `
    <div #pdfViewerContainer class="ng2-pdf-viewer-container" style="position:absolute;width:100%">
      <div class="pdfViewer"></div>
    </div>
  `,
                styles: [".ng2-pdf-viewer-container{overflow-x:auto;position:absolute;height:100%;-webkit-overflow-scrolling:touch}:host ::ng-deep .textLayer{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;opacity:.2;line-height:1}:host ::ng-deep .textLayer>span{color:transparent;position:absolute;white-space:pre;cursor:text;transform-origin:0 0}:host ::ng-deep .textLayer .highlight{margin:-1px;padding:1px;background-color:#b400aa;border-radius:4px}:host ::ng-deep .textLayer .highlight.begin{border-radius:4px 0 0 4px}:host ::ng-deep .textLayer .highlight.end{border-radius:0 4px 4px 0}:host ::ng-deep .textLayer .highlight.middle{border-radius:0}:host ::ng-deep .textLayer .highlight.selected{background-color:#006400}:host ::ng-deep .textLayer ::-moz-selection{background:#00f}:host ::ng-deep .textLayer ::selection{background:#00f}:host ::ng-deep .textLayer .endOfContent{display:block;position:absolute;left:0;top:100%;right:0;bottom:0;z-index:-1;cursor:default;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}:host ::ng-deep .textLayer .endOfContent.active{top:0}:host ::ng-deep .annotationLayer section{position:absolute}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.pushButton>a,:host ::ng-deep .annotationLayer .linkAnnotation>a{position:absolute;font-size:1em;top:0;left:0;width:100%;height:100%}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.pushButton>a:hover,:host ::ng-deep .annotationLayer .linkAnnotation>a:hover{opacity:.2;background:#ff0;box-shadow:0 2px 10px #ff0}:host ::ng-deep .annotationLayer .textAnnotation img{position:absolute;cursor:pointer}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input,:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select,:host ::ng-deep .annotationLayer .textWidgetAnnotation input,:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea{background-color:rgba(0,54,255,.13);border:1px solid transparent;box-sizing:border-box;font-size:9px;height:100%;margin:0;padding:0 3px;vertical-align:top;width:100%}:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select option{padding:0}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input{border-radius:50%}:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea{font:message-box;font-size:9px;resize:none}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input[disabled],:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input[disabled],:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select[disabled],:host ::ng-deep .annotationLayer .textWidgetAnnotation input[disabled],:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea[disabled]{background:none;border:1px solid transparent;cursor:not-allowed}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:hover,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input:hover,:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select:hover,:host ::ng-deep .annotationLayer .textWidgetAnnotation input:hover,:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea:hover{border:1px solid #000}:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select:focus,:host ::ng-deep .annotationLayer .textWidgetAnnotation input:focus,:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea:focus{background:none;border:1px solid transparent}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:after,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:before,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input:checked:before{background-color:#000;content:\"\";display:block;position:absolute}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:after,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:before{height:80%;left:45%;width:1px}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:before{transform:rotate(45deg)}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:after{transform:rotate(-45deg)}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input:checked:before{border-radius:50%;height:50%;left:30%;top:20%;width:50%}:host ::ng-deep .annotationLayer .textWidgetAnnotation input.comb{font-family:monospace;padding-left:2px;padding-right:0}:host ::ng-deep .annotationLayer .textWidgetAnnotation input.comb:focus{width:115%}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input{-webkit-appearance:none;-moz-appearance:none;appearance:none;padding:0}:host ::ng-deep .annotationLayer .popupWrapper{position:absolute;width:20em}:host ::ng-deep .annotationLayer .popup{position:absolute;z-index:200;max-width:20em;background-color:#ff9;box-shadow:0 2px 5px #888;border-radius:2px;padding:6px;margin-left:5px;cursor:pointer;font:message-box;font-size:9px;word-wrap:break-word}:host ::ng-deep .annotationLayer .popup>*{font-size:9px}:host ::ng-deep .annotationLayer .popup h1{display:inline-block}:host ::ng-deep .annotationLayer .popup span{display:inline-block;margin-left:5px}:host ::ng-deep .annotationLayer .popup p{border-top:1px solid #333;margin-top:2px;padding-top:2px}:host ::ng-deep .annotationLayer .caretAnnotation,:host ::ng-deep .annotationLayer .circleAnnotation svg ellipse,:host ::ng-deep .annotationLayer .fileAttachmentAnnotation,:host ::ng-deep .annotationLayer .freeTextAnnotation,:host ::ng-deep .annotationLayer .highlightAnnotation,:host ::ng-deep .annotationLayer .inkAnnotation svg polyline,:host ::ng-deep .annotationLayer .lineAnnotation svg line,:host ::ng-deep .annotationLayer .polygonAnnotation svg polygon,:host ::ng-deep .annotationLayer .polylineAnnotation svg polyline,:host ::ng-deep .annotationLayer .squareAnnotation svg rect,:host ::ng-deep .annotationLayer .squigglyAnnotation,:host ::ng-deep .annotationLayer .stampAnnotation,:host ::ng-deep .annotationLayer .strikeoutAnnotation,:host ::ng-deep .annotationLayer .underlineAnnotation{cursor:pointer}:host ::ng-deep .pdfViewer{padding-bottom:10px}:host ::ng-deep .pdfViewer .canvasWrapper{overflow:hidden}:host ::ng-deep .pdfViewer .page{direction:ltr;width:816px;height:1056px;margin:1px auto -8px;position:relative;overflow:visible;border:9px solid rgba(0,0,0,.01);box-sizing:content-box;box-sizing:initial;background-clip:content-box;-o-border-image:url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAQAAADYWf5HAAAA6UlEQVR4Xl2Pi2rEMAwE16fm1f7/r14v7w4rI0IzLAF7hLxNevBSEMEF5+OilNCsRd8ZMyn+a4NmsOT8WJw1lFbSYgGFzF2bLFoLjTClWjKKGRWpDYAGXUnZ4uhbBUzF3Oe/GG/ue2fn4GgsyXhNgysV2JnrhKEMg4fEZcALmiKbNhBBRFpSyDOj1G4QOVly6O1FV54ZZq8OVygrciDt6JazRgi1ljTPH0gbrPmHPXAbCiDd4GawIjip1TPh9tt2sz24qaCjr/jAb/GBFTbq9KZ7Ke/Cqt8nayUikZKsWZK7Fe6bg5dOUt8fZHWG2BHc+6EAAAAASUVORK5CYII=\") 9 9 repeat;border-image:url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAQAAADYWf5HAAAA6UlEQVR4Xl2Pi2rEMAwE16fm1f7/r14v7w4rI0IzLAF7hLxNevBSEMEF5+OilNCsRd8ZMyn+a4NmsOT8WJw1lFbSYgGFzF2bLFoLjTClWjKKGRWpDYAGXUnZ4uhbBUzF3Oe/GG/ue2fn4GgsyXhNgysV2JnrhKEMg4fEZcALmiKbNhBBRFpSyDOj1G4QOVly6O1FV54ZZq8OVygrciDt6JazRgi1ljTPH0gbrPmHPXAbCiDd4GawIjip1TPh9tt2sz24qaCjr/jAb/GBFTbq9KZ7Ke/Cqt8nayUikZKsWZK7Fe6bg5dOUt8fZHWG2BHc+6EAAAAASUVORK5CYII=\") 9 9 repeat;background-color:#fff}:host ::ng-deep .pdfViewer.removePageBorders .page{margin:0 auto 10px;border:none}:host ::ng-deep .pdfViewer.removePageBorders{padding-bottom:0}:host ::ng-deep .pdfViewer.singlePageView{display:inline-block}:host ::ng-deep .pdfViewer.singlePageView .page{margin:0;border:none}:host ::ng-deep .pdfViewer.scrollHorizontal,:host ::ng-deep .pdfViewer.scrollWrapped,:host ::ng-deep .spread{margin-left:3.5px;margin-right:3.5px;text-align:center}:host ::ng-deep .pdfViewer.scrollHorizontal,:host ::ng-deep .spread{white-space:nowrap}:host ::ng-deep .pdfViewer.removePageBorders,:host ::ng-deep .pdfViewer.scrollHorizontal .spread,:host ::ng-deep .pdfViewer.scrollWrapped .spread{margin-left:0;margin-right:0}:host ::ng-deep .pdfViewer.scrollHorizontal .page,:host ::ng-deep .pdfViewer.scrollHorizontal .spread,:host ::ng-deep .pdfViewer.scrollWrapped .page,:host ::ng-deep .pdfViewer.scrollWrapped .spread,:host ::ng-deep .spread .page{display:inline-block;vertical-align:middle}:host ::ng-deep .pdfViewer.scrollHorizontal .page,:host ::ng-deep .pdfViewer.scrollWrapped .page,:host ::ng-deep .spread .page{margin-left:-3.5px;margin-right:-3.5px}:host ::ng-deep .pdfViewer.removePageBorders.scrollHorizontal .page,:host ::ng-deep .pdfViewer.removePageBorders.scrollWrapped .page,:host ::ng-deep .pdfViewer.removePageBorders .spread .page{margin-left:5px;margin-right:5px}:host ::ng-deep .pdfViewer .page canvas{margin:0;display:block}:host ::ng-deep .pdfViewer .page canvas[hidden]{display:none}:host ::ng-deep .pdfViewer .page .loadingIcon{position:absolute;display:block;left:0;top:0;right:0;bottom:0;background:url(\"data:image/gif;base64,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\") 50% no-repeat}:host ::ng-deep .pdfPresentationMode .pdfViewer{margin-left:0;margin-right:0}:host ::ng-deep .pdfPresentationMode .pdfViewer .page,:host ::ng-deep .pdfPresentationMode .pdfViewer .spread{display:block}:host ::ng-deep .pdfPresentationMode .pdfViewer .page,:host ::ng-deep .pdfPresentationMode .pdfViewer.removePageBorders .page{margin-left:auto;margin-right:auto}:host ::ng-deep .pdfPresentationMode:-ms-fullscreen .pdfViewer .page{margin-bottom:100%!important}:host ::ng-deep .pdfPresentationMode:-webkit-full-screen .pdfViewer .page{margin-bottom:100%;border:0}:host ::ng-deep .pdfPresentationMode:-moz-full-screen .pdfViewer .page,:host ::ng-deep .pdfPresentationMode:-webkit-full-screen .pdfViewer .page,:host ::ng-deep .pdfPresentationMode:fullscreen .pdfViewer .page{margin-bottom:100%;border:0}"]
            },] }
];
PdfViewerComponent.ctorParameters = () => [
    { type: ElementRef }
];
PdfViewerComponent.propDecorators = {
    pdfViewerContainer: [{ type: ViewChild, args: ['pdfViewerContainer',] }],
    afterLoadComplete: [{ type: Output, args: ['after-load-complete',] }],
    pageRendered: [{ type: Output, args: ['page-rendered',] }],
    pageInitialized: [{ type: Output, args: ['pages-initialized',] }],
    textLayerRendered: [{ type: Output, args: ['text-layer-rendered',] }],
    onError: [{ type: Output, args: ['error',] }],
    onProgress: [{ type: Output, args: ['on-progress',] }],
    pageChange: [{ type: Output }],
    src: [{ type: Input }],
    cMapsUrl: [{ type: Input, args: ['c-maps-url',] }],
    page: [{ type: Input, args: ['page',] }],
    renderText: [{ type: Input, args: ['render-text',] }],
    renderTextMode: [{ type: Input, args: ['render-text-mode',] }],
    originalSize: [{ type: Input, args: ['original-size',] }],
    showAll: [{ type: Input, args: ['show-all',] }],
    stickToPage: [{ type: Input, args: ['stick-to-page',] }],
    zoom: [{ type: Input, args: ['zoom',] }],
    zoomScale: [{ type: Input, args: ['zoom-scale',] }],
    rotation: [{ type: Input, args: ['rotation',] }],
    externalLinkTarget: [{ type: Input, args: ['external-link-target',] }],
    autoresize: [{ type: Input, args: ['autoresize',] }],
    fitToPage: [{ type: Input, args: ['fit-to-page',] }],
    showBorders: [{ type: Input, args: ['show-borders',] }],
    onPageResize: [{ type: HostListener, args: ['window:resize', [],] }]
};

/**
 * Created by vadimdez on 01/11/2016.
 */
class PdfViewerModule {
}
PdfViewerModule.decorators = [
    { type: NgModule, args: [{
                declarations: [PdfViewerComponent],
                exports: [PdfViewerComponent]
            },] }
];

/**
 * Generated bundle index. Do not edit.
 */

export { PdfViewerComponent, PdfViewerModule, RenderTextMode };
//# sourceMappingURL=ng2-pdf-viewer.js.map
