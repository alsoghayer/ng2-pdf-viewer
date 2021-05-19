/**
 * Created by vadimdez on 21/06/16.
 */
import { Component, Input, Output, ElementRef, EventEmitter, HostListener, ViewChild } from '@angular/core';
import { from, fromEvent, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as PDFJS from 'pdfjs-dist/build/pdf';
import * as PDFJSViewer from 'pdfjs-dist/web/pdf_viewer';
import { createEventBus } from '../utils/event-bus-utils';
import { assign, isSSR } from '../utils/helpers';
if (!isSSR()) {
    assign(PDFJS, "verbosity", PDFJS.VerbosityLevel.ERRORS);
}
export var RenderTextMode;
(function (RenderTextMode) {
    RenderTextMode[RenderTextMode["DISABLED"] = 0] = "DISABLED";
    RenderTextMode[RenderTextMode["ENABLED"] = 1] = "ENABLED";
    RenderTextMode[RenderTextMode["ENHANCED"] = 2] = "ENHANCED";
})(RenderTextMode || (RenderTextMode = {}));
export class PdfViewerComponent {
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
                styles: [".ng2-pdf-viewer-container{overflow-x:auto;position:absolute;height:100%;-webkit-overflow-scrolling:touch}:host ::ng-deep .textLayer{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;opacity:.2;line-height:1}:host ::ng-deep .textLayer>span{color:transparent;position:absolute;white-space:pre;cursor:text;transform-origin:0 0}:host ::ng-deep .textLayer .highlight{margin:-1px;padding:1px;background-color:#b400aa;border-radius:4px}:host ::ng-deep .textLayer .highlight.begin{border-radius:4px 0 0 4px}:host ::ng-deep .textLayer .highlight.end{border-radius:0 4px 4px 0}:host ::ng-deep .textLayer .highlight.middle{border-radius:0}:host ::ng-deep .textLayer .highlight.selected{background-color:#006400}:host ::ng-deep .textLayer ::-moz-selection{background:#00f}:host ::ng-deep .textLayer ::selection{background:#00f}:host ::ng-deep .textLayer .endOfContent{display:block;position:absolute;left:0;top:100%;right:0;bottom:0;z-index:-1;cursor:default;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}:host ::ng-deep .textLayer .endOfContent.active{top:0}:host ::ng-deep .annotationLayer section{position:absolute}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.pushButton>a,:host ::ng-deep .annotationLayer .linkAnnotation>a{position:absolute;font-size:1em;top:0;left:0;width:100%;height:100%}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.pushButton>a:hover,:host ::ng-deep .annotationLayer .linkAnnotation>a:hover{opacity:.2;background:#ff0;box-shadow:0 2px 10px #ff0}:host ::ng-deep .annotationLayer .textAnnotation img{position:absolute;cursor:pointer}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input,:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select,:host ::ng-deep .annotationLayer .textWidgetAnnotation input,:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea{background-color:rgba(0,54,255,.13);border:1px solid transparent;box-sizing:border-box;font-size:9px;height:100%;margin:0;padding:0 3px;vertical-align:top;width:100%}:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select option{padding:0}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input{border-radius:50%}:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea{font:message-box;font-size:9px;resize:none}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input[disabled],:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input[disabled],:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select[disabled],:host ::ng-deep .annotationLayer .textWidgetAnnotation input[disabled],:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea[disabled]{background:none;border:1px solid transparent;cursor:not-allowed}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:hover,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input:hover,:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select:hover,:host ::ng-deep .annotationLayer .textWidgetAnnotation input:hover,:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea:hover{border:1px solid #000}:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select:focus,:host ::ng-deep .annotationLayer .textWidgetAnnotation input:focus,:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea:focus{background:none;border:1px solid transparent}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:after,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:before,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input:checked:before{background-color:#000;content:\"\";display:block;position:absolute}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:after,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:before{height:80%;left:45%;width:1px}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:before{transform:rotate(45deg)}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:after{transform:rotate(-45deg)}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input:checked:before{border-radius:50%;height:50%;left:30%;top:20%;width:50%}:host ::ng-deep .annotationLayer .textWidgetAnnotation input.comb{font-family:monospace;padding-left:2px;padding-right:0}:host ::ng-deep .annotationLayer .textWidgetAnnotation input.comb:focus{width:115%}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input{-webkit-appearance:none;-moz-appearance:none;appearance:none;padding:0}:host ::ng-deep .annotationLayer .popupWrapper{position:absolute;width:20em}:host ::ng-deep .annotationLayer .popup{position:absolute;z-index:200;max-width:20em;background-color:#ff9;box-shadow:0 2px 5px #888;border-radius:2px;padding:6px;margin-left:5px;cursor:pointer;font:message-box;font-size:9px;word-wrap:break-word}:host ::ng-deep .annotationLayer .popup>*{font-size:9px}:host ::ng-deep .annotationLayer .popup h1{display:inline-block}:host ::ng-deep .annotationLayer .popup span{display:inline-block;margin-left:5px}:host ::ng-deep .annotationLayer .popup p{border-top:1px solid #333;margin-top:2px;padding-top:2px}:host ::ng-deep .annotationLayer .caretAnnotation,:host ::ng-deep .annotationLayer .circleAnnotation svg ellipse,:host ::ng-deep .annotationLayer .fileAttachmentAnnotation,:host ::ng-deep .annotationLayer .freeTextAnnotation,:host ::ng-deep .annotationLayer .highlightAnnotation,:host ::ng-deep .annotationLayer .inkAnnotation svg polyline,:host ::ng-deep .annotationLayer .lineAnnotation svg line,:host ::ng-deep .annotationLayer .polygonAnnotation svg polygon,:host ::ng-deep .annotationLayer .polylineAnnotation svg polyline,:host ::ng-deep .annotationLayer .squareAnnotation svg rect,:host ::ng-deep .annotationLayer .squigglyAnnotation,:host ::ng-deep .annotationLayer .stampAnnotation,:host ::ng-deep .annotationLayer .strikeoutAnnotation,:host ::ng-deep .annotationLayer .underlineAnnotation{cursor:pointer}:host ::ng-deep .pdfViewer{padding-bottom:10px}:host ::ng-deep .pdfViewer .canvasWrapper{overflow:hidden}:host ::ng-deep .pdfViewer .page{direction:ltr;width:816px;height:1056px;margin:1px auto -8px;position:relative;overflow:visible;border:9px solid rgba(0,0,0,.01);box-sizing:content-box;box-sizing:initial;background-clip:content-box;-o-border-image:url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAQAAADYWf5HAAAA6UlEQVR4Xl2Pi2rEMAwE16fm1f7/r14v7w4rI0IzLAF7hLxNevBSEMEF5+OilNCsRd8ZMyn+a4NmsOT8WJw1lFbSYgGFzF2bLFoLjTClWjKKGRWpDYAGXUnZ4uhbBUzF3Oe/GG/ue2fn4GgsyXhNgysV2JnrhKEMg4fEZcALmiKbNhBBRFpSyDOj1G4QOVly6O1FV54ZZq8OVygrciDt6JazRgi1ljTPH0gbrPmHPXAbCiDd4GawIjip1TPh9tt2sz24qaCjr/jAb/GBFTbq9KZ7Ke/Cqt8nayUikZKsWZK7Fe6bg5dOUt8fZHWG2BHc+6EAAAAASUVORK5CYII=\") 9 9 repeat;border-image:url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAQAAADYWf5HAAAA6UlEQVR4Xl2Pi2rEMAwE16fm1f7/r14v7w4rI0IzLAF7hLxNevBSEMEF5+OilNCsRd8ZMyn+a4NmsOT8WJw1lFbSYgGFzF2bLFoLjTClWjKKGRWpDYAGXUnZ4uhbBUzF3Oe/GG/ue2fn4GgsyXhNgysV2JnrhKEMg4fEZcALmiKbNhBBRFpSyDOj1G4QOVly6O1FV54ZZq8OVygrciDt6JazRgi1ljTPH0gbrPmHPXAbCiDd4GawIjip1TPh9tt2sz24qaCjr/jAb/GBFTbq9KZ7Ke/Cqt8nayUikZKsWZK7Fe6bg5dOUt8fZHWG2BHc+6EAAAAASUVORK5CYII=\") 9 9 repeat;background-color:#fff}:host ::ng-deep .pdfViewer.removePageBorders .page{margin:0 auto 10px;border:none}:host ::ng-deep .pdfViewer.removePageBorders{padding-bottom:0}:host ::ng-deep .pdfViewer.singlePageView{display:inline-block}:host ::ng-deep .pdfViewer.singlePageView .page{margin:0;border:none}:host ::ng-deep .pdfViewer.scrollHorizontal,:host ::ng-deep .pdfViewer.scrollWrapped,:host ::ng-deep .spread{margin-left:3.5px;margin-right:3.5px;text-align:center}:host ::ng-deep .pdfViewer.scrollHorizontal,:host ::ng-deep .spread{white-space:nowrap}:host ::ng-deep .pdfViewer.removePageBorders,:host ::ng-deep .pdfViewer.scrollHorizontal .spread,:host ::ng-deep .pdfViewer.scrollWrapped .spread{margin-left:0;margin-right:0}:host ::ng-deep .pdfViewer.scrollHorizontal .page,:host ::ng-deep .pdfViewer.scrollHorizontal .spread,:host ::ng-deep .pdfViewer.scrollWrapped .page,:host ::ng-deep .pdfViewer.scrollWrapped .spread,:host ::ng-deep .spread .page{display:inline-block;vertical-align:middle}:host ::ng-deep .pdfViewer.scrollHorizontal .page,:host ::ng-deep .pdfViewer.scrollWrapped .page,:host ::ng-deep .spread .page{margin-left:-3.5px;margin-right:-3.5px}:host ::ng-deep .pdfViewer.removePageBorders.scrollHorizontal .page,:host ::ng-deep .pdfViewer.removePageBorders.scrollWrapped .page,:host ::ng-deep .pdfViewer.removePageBorders .spread .page{margin-left:5px;margin-right:5px}:host ::ng-deep .pdfViewer .page canvas{margin:0;display:block}:host ::ng-deep .pdfViewer .page canvas[hidden]{display:none}:host ::ng-deep .pdfViewer .page .loadingIcon{position:absolute;display:block;left:0;top:0;right:0;bottom:0;background:url(\"data:image/gif;base64,R0lGODlhGAAYAPQAAP///wAAAM7Ozvr6+uDg4LCwsOjo6I6OjsjIyJycnNjY2KioqMDAwPLy8nZ2doaGhri4uGhoaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJBwAAACwAAAAAGAAYAAAFriAgjiQAQWVaDgr5POSgkoTDjFE0NoQ8iw8HQZQTDQjDn4jhSABhAAOhoTqSDg7qSUQwxEaEwwFhXHhHgzOA1xshxAnfTzotGRaHglJqkJcaVEqCgyoCBQkJBQKDDXQGDYaIioyOgYSXA36XIgYMBWRzXZoKBQUMmil0lgalLSIClgBpO0g+s26nUWddXyoEDIsACq5SsTMMDIECwUdJPw0Mzsu0qHYkw72bBmozIQAh+QQJBwAAACwAAAAAGAAYAAAFsCAgjiTAMGVaDgR5HKQwqKNxIKPjjFCk0KNXC6ATKSI7oAhxWIhezwhENTCQEoeGCdWIPEgzESGxEIgGBWstEW4QCGGAIJEoxGmGt5ZkgCRQQHkGd2CESoeIIwoMBQUMP4cNeQQGDYuNj4iSb5WJnmeGng0CDGaBlIQEJziHk3sABidDAHBgagButSKvAAoyuHuUYHgCkAZqebw0AgLBQyyzNKO3byNuoSS8x8OfwIchACH5BAkHAAAALAAAAAAYABgAAAW4ICCOJIAgZVoOBJkkpDKoo5EI43GMjNPSokXCINKJCI4HcCRIQEQvqIOhGhBHhUTDhGo4diOZyFAoKEQDxra2mAEgjghOpCgz3LTBIxJ5kgwMBShACREHZ1V4Kg1rS44pBAgMDAg/Sw0GBAQGDZGTlY+YmpyPpSQDiqYiDQoCliqZBqkGAgKIS5kEjQ21VwCyp76dBHiNvz+MR74AqSOdVwbQuo+abppo10ssjdkAnc0rf8vgl8YqIQAh+QQJBwAAACwAAAAAGAAYAAAFrCAgjiQgCGVaDgZZFCQxqKNRKGOSjMjR0qLXTyciHA7AkaLACMIAiwOC1iAxCrMToHHYjWQiA4NBEA0Q1RpWxHg4cMXxNDk4OBxNUkPAQAEXDgllKgMzQA1pSYopBgonCj9JEA8REQ8QjY+RQJOVl4ugoYssBJuMpYYjDQSliwasiQOwNakALKqsqbWvIohFm7V6rQAGP6+JQLlFg7KDQLKJrLjBKbvAor3IKiEAIfkECQcAAAAsAAAAABgAGAAABbUgII4koChlmhokw5DEoI4NQ4xFMQoJO4uuhignMiQWvxGBIQC+AJBEUyUcIRiyE6CR0CllW4HABxBURTUw4nC4FcWo5CDBRpQaCoF7VjgsyCUDYDMNZ0mHdwYEBAaGMwwHDg4HDA2KjI4qkJKUiJ6faJkiA4qAKQkRB3E0i6YpAw8RERAjA4tnBoMApCMQDhFTuySKoSKMJAq6rD4GzASiJYtgi6PUcs9Kew0xh7rNJMqIhYchACH5BAkHAAAALAAAAAAYABgAAAW0ICCOJEAQZZo2JIKQxqCOjWCMDDMqxT2LAgELkBMZCoXfyCBQiFwiRsGpku0EshNgUNAtrYPT0GQVNRBWwSKBMp98P24iISgNDAS4ipGA6JUpA2WAhDR4eWM/CAkHBwkIDYcGiTOLjY+FmZkNlCN3eUoLDmwlDW+AAwcODl5bYl8wCVYMDw5UWzBtnAANEQ8kBIM0oAAGPgcREIQnVloAChEOqARjzgAQEbczg8YkWJq8nSUhACH5BAkHAAAALAAAAAAYABgAAAWtICCOJGAYZZoOpKKQqDoORDMKwkgwtiwSBBYAJ2owGL5RgxBziQQMgkwoMkhNqAEDARPSaiMDFdDIiRSFQowMXE8Z6RdpYHWnEAWGPVkajPmARVZMPUkCBQkJBQINgwaFPoeJi4GVlQ2Qc3VJBQcLV0ptfAMJBwdcIl+FYjALQgimoGNWIhAQZA4HXSpLMQ8PIgkOSHxAQhERPw7ASTSFyCMMDqBTJL8tf3y2fCEAIfkECQcAAAAsAAAAABgAGAAABa8gII4k0DRlmg6kYZCoOg5EDBDEaAi2jLO3nEkgkMEIL4BLpBAkVy3hCTAQKGAznM0AFNFGBAbj2cA9jQixcGZAGgECBu/9HnTp+FGjjezJFAwFBQwKe2Z+KoCChHmNjVMqA21nKQwJEJRlbnUFCQlFXlpeCWcGBUACCwlrdw8RKGImBwktdyMQEQciB7oACwcIeA4RVwAODiIGvHQKERAjxyMIB5QlVSTLYLZ0sW8hACH5BAkHAAAALAAAAAAYABgAAAW0ICCOJNA0ZZoOpGGQrDoOBCoSxNgQsQzgMZyIlvOJdi+AS2SoyXrK4umWPM5wNiV0UDUIBNkdoepTfMkA7thIECiyRtUAGq8fm2O4jIBgMBA1eAZ6Knx+gHaJR4QwdCMKBxEJRggFDGgQEREPjjAMBQUKIwIRDhBDC2QNDDEKoEkDoiMHDigICGkJBS2dDA6TAAnAEAkCdQ8ORQcHTAkLcQQODLPMIgIJaCWxJMIkPIoAt3EhACH5BAkHAAAALAAAAAAYABgAAAWtICCOJNA0ZZoOpGGQrDoOBCoSxNgQsQzgMZyIlvOJdi+AS2SoyXrK4umWHM5wNiV0UN3xdLiqr+mENcWpM9TIbrsBkEck8oC0DQqBQGGIz+t3eXtob0ZTPgNrIwQJDgtGAgwCWSIMDg4HiiUIDAxFAAoODwxDBWINCEGdSTQkCQcoegADBaQ6MggHjwAFBZUFCm0HB0kJCUy9bAYHCCPGIwqmRq0jySMGmj6yRiEAIfkECQcAAAAsAAAAABgAGAAABbIgII4k0DRlmg6kYZCsOg4EKhLE2BCxDOAxnIiW84l2L4BLZKipBopW8XRLDkeCiAMyMvQAA+uON4JEIo+vqukkKQ6RhLHplVGN+LyKcXA4Dgx5DWwGDXx+gIKENnqNdzIDaiMECwcFRgQCCowiCAcHCZIlCgICVgSfCEMMnA0CXaU2YSQFoQAKUQMMqjoyAglcAAyBAAIMRUYLCUkFlybDeAYJryLNk6xGNCTQXY0juHghACH5BAkHAAAALAAAAAAYABgAAAWzICCOJNA0ZVoOAmkY5KCSSgSNBDE2hDyLjohClBMNij8RJHIQvZwEVOpIekRQJyJs5AMoHA+GMbE1lnm9EcPhOHRnhpwUl3AsknHDm5RN+v8qCAkHBwkIfw1xBAYNgoSGiIqMgJQifZUjBhAJYj95ewIJCQV7KYpzBAkLLQADCHOtOpY5PgNlAAykAEUsQ1wzCgWdCIdeArczBQVbDJ0NAqyeBb64nQAGArBTt8R8mLuyPyEAOwAAAAAAAAAAAA==\") 50% no-repeat}:host ::ng-deep .pdfPresentationMode .pdfViewer{margin-left:0;margin-right:0}:host ::ng-deep .pdfPresentationMode .pdfViewer .page,:host ::ng-deep .pdfPresentationMode .pdfViewer .spread{display:block}:host ::ng-deep .pdfPresentationMode .pdfViewer .page,:host ::ng-deep .pdfPresentationMode .pdfViewer.removePageBorders .page{margin-left:auto;margin-right:auto}:host ::ng-deep .pdfPresentationMode:-ms-fullscreen .pdfViewer .page{margin-bottom:100%!important}:host ::ng-deep .pdfPresentationMode:-webkit-full-screen .pdfViewer .page{margin-bottom:100%;border:0}:host ::ng-deep .pdfPresentationMode:-moz-full-screen .pdfViewer .page,:host ::ng-deep .pdfPresentationMode:-webkit-full-screen .pdfViewer .page,:host ::ng-deep .pdfPresentationMode:fullscreen .pdfViewer .page{margin-bottom:100%;border:0}"]
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGRmLXZpZXdlci5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvYXBwL3BkZi12aWV3ZXIvcGRmLXZpZXdlci5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFDSCxPQUFPLEVBQ0wsU0FBUyxFQUNULEtBQUssRUFDTCxNQUFNLEVBQ04sVUFBVSxFQUNWLFlBQVksRUFJWixZQUFZLEVBRVosU0FBUyxFQUVWLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUNoRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFTM0MsT0FBTyxLQUFLLEtBQUssTUFBTSxzQkFBc0IsQ0FBQztBQUM5QyxPQUFPLEtBQUssV0FBVyxNQUFNLDJCQUEyQixDQUFDO0FBRXpELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRWpELElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRTtJQUNaLE1BQU0sQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7Q0FDekQ7QUFFRCxNQUFNLENBQU4sSUFBWSxjQUlYO0FBSkQsV0FBWSxjQUFjO0lBQ3hCLDJEQUFRLENBQUE7SUFDUix5REFBTyxDQUFBO0lBQ1AsMkRBQVEsQ0FBQTtBQUNWLENBQUMsRUFKVyxjQUFjLEtBQWQsY0FBYyxRQUl6QjtBQVdELE1BQU0sT0FBTyxrQkFBa0I7SUFzSzdCLFlBQW9CLE9BQW1CO1FBQW5CLFlBQU8sR0FBUCxPQUFPLENBQVk7UUEvSi9CLGNBQVMsR0FBRyxLQUFLLENBQUM7UUFTbEIsY0FBUyxHQUNmLE9BQU8sS0FBSyxLQUFL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LElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztTQUM1RDtJQUNILENBQUM7O0FBN21CTSw0QkFBUyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUM7QUFDeEIsK0JBQVksR0FBRyxDQUFDLENBQUM7O1lBWnpCLFNBQVMsU0FBQztnQkFDVCxRQUFRLEVBQUUsWUFBWTtnQkFDdEIsUUFBUSxFQUFFOzs7O0dBSVQ7O2FBRUY7OztZQTVDQyxVQUFVOzs7aUNBa0RULFNBQVMsU0FBQyxvQkFBb0I7Z0NBc0M5QixNQUFNLFNBQUMscUJBQXFCOzJCQUM1QixNQUFNLFNBQUMsZUFBZTs4QkFDdEIsTUFBTSxTQUFDLG1CQUFtQjtnQ0FDMUIsTUFBTSxTQUFDLHFCQUFxQjtzQkFDNUIsTUFBTSxTQUFDLE9BQU87eUJBQ2QsTUFBTSxTQUFDLGFBQWE7eUJBQ3BCLE1BQU07a0JBQ04sS0FBSzt1QkFFTCxLQUFLLFNBQUMsWUFBWTttQkFLbEIsS0FBSyxTQUFDLE1BQU07eUJBZVosS0FBSyxTQUFDLGFBQWE7NkJBS25CLEtBQUssU0FBQyxrQkFBa0I7MkJBS3hCLEtBQUssU0FBQyxlQUFlO3NCQUtyQixLQUFLLFNBQUMsVUFBVTswQkFLaEIsS0FBSyxTQUFDLGVBQWU7bUJBS3JCLEtBQUssU0FBQyxNQUFNO3dCQWFaLEtBQUssU0FBQyxZQUFZO3VCQVNsQixLQUFLLFNBQUMsVUFBVTtpQ0FVaEIsS0FBSyxTQUFDLHNCQUFzQjt5QkFLNUIsS0FBSyxTQUFDLFlBQVk7d0JBS2xCLEtBQUssU0FBQyxhQUFhOzBCQUtuQixLQUFLLFNBQUMsY0FBYzsyQkErRXBCLFlBQVksU0FBQyxlQUFlLEVBQUUsRUFBRSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQ3JlYXRlZCBieSB2YWRpbWRleiBvbiAyMS8wNi8xNi5cbiAqL1xuaW1wb3J0IHtcbiAgQ29tcG9uZW50LFxuICBJbnB1dCxcbiAgT3V0cHV0LFxuICBFbGVtZW50UmVmLFxuICBFdmVudEVtaXR0ZXIsXG4gIE9uQ2hhbmdlcyxcbiAgU2ltcGxlQ2hhbmdlcyxcbiAgT25Jbml0LFxuICBIb3N0TGlzdGVuZXIsXG4gIE9uRGVzdHJveSxcbiAgVmlld0NoaWxkLFxuICBBZnRlclZpZXdDaGVja2VkXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgZnJvbSwgZnJvbUV2ZW50LCBTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyB0YWtlVW50aWwgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge1xuICBQREZEb2N1bWVudFByb3h5LFxuICBQREZWaWV3ZXJQYXJhbXMsXG4gIFBERlBhZ2VQcm94eSxcbiAgUERGU291cmNlLFxuICBQREZQcm9ncmVzc0RhdGEsXG4gIFBERlByb21pc2Vcbn0gZnJvbSAncGRmanMtZGlzdC9idWlsZC9wZGYnO1xuaW1wb3J0ICogYXMgUERGSlMgZnJvbSAncGRmanMtZGlzdC9idWlsZC9wZGYnO1xuaW1wb3J0ICogYXMgUERGSlNWaWV3ZXIgZnJvbSAncGRmanMtZGlzdC93ZWIvcGRmX3ZpZXdlcic7XG5cbmltcG9ydCB7IGNyZWF0ZUV2ZW50QnVzIH0gZnJvbSAnLi4vdXRpbHMvZXZlbnQtYnVzLXV0aWxzJztcbmltcG9ydCB7IGFzc2lnbiwgaXNTU1IgfSBmcm9tICcuLi91dGlscy9oZWxwZXJzJztcblxuaWYgKCFpc1NTUigpKSB7XG4gIGFzc2lnbihQREZKUywgXCJ2ZXJib3NpdHlcIiwgUERGSlMuVmVyYm9zaXR5TGV2ZWwuRVJST1JTKTtcbn1cblxuZXhwb3J0IGVudW0gUmVuZGVyVGV4dE1vZGUge1xuICBESVNBQkxFRCxcbiAgRU5BQkxFRCxcbiAgRU5IQU5DRURcbn1cblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAncGRmLXZpZXdlcicsXG4gIHRlbXBsYXRlOiBgXG4gICAgPGRpdiAjcGRmVmlld2VyQ29udGFpbmVyIGNsYXNzPVwibmcyLXBkZi12aWV3ZXItY29udGFpbmVyXCIgc3R5bGU9XCJwb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDoxMDAlXCI+XG4gICAgICA8ZGl2IGNsYXNzPVwicGRmVmlld2VyXCI+PC9kaXY+XG4gICAgPC9kaXY+XG4gIGAsXG4gIHN0eWxlVXJsczogWycuL3BkZi12aWV3ZXIuY29tcG9uZW50LnNjc3MnXVxufSlcbmV4cG9ydCBjbGFzcyBQZGZWaWV3ZXJDb21wb25lbnRcbiAgaW1wbGVtZW50cyBPbkNoYW5nZXMsIE9uSW5pdCwgT25EZXN0cm95LCBBZnRlclZpZXdDaGVja2VkIHtcbiAgc3RhdGljIENTU19VTklUUyA9IDk2LjAgLyA3Mi4wO1xuICBzdGF0aWMgQk9SREVSX1dJRFRIID0gOTtcblxuICBAVmlld0NoaWxkKCdwZGZWaWV3ZXJDb250YWluZXInKSBwZGZWaWV3ZXJDb250YWluZXI7XG5cbiAgcHJpdmF0ZSBpc1Zpc2libGUgPSBmYWxzZTtcbiAgcHJpdmF0ZSBwZGZNdWx0aVBhZ2VWaWV3ZXI6IGFueTtcbiAgcHJpdmF0ZSBwZGZNdWx0aVBhZ2VMaW5rU2VydmljZTogYW55O1xuICBwcml2YXRlIHBkZk11bHRpUGFnZUZpbmRDb250cm9sbGVyOiBhbnk7XG5cbiAgcHJpdmF0ZSBwZGZTaW5nbGVQYWdlVmlld2VyOiBhbnk7XG4gIHByaXZhdGUgcGRmU2luZ2xlUGFnZUxpbmtTZXJ2aWNlOiBhbnk7XG4gIHByaXZhdGUgcGRmU2luZ2xlUGFnZUZpbmRDb250cm9sbGVyOiBhbnk7XG5cbiAgcHJpdmF0ZSBfY01hcHNVcmwgPVxuICAgIHR5cGVvZiBQREZKUyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgID8gYGh0dHBzOi8vdW5wa2cuY29tL3BkZmpzLWRpc3RAJHsoUERGSlMgYXMgYW55KS52ZXJzaW9ufS9jbWFwcy9gXG4gICAgICA6IG51bGw7XG4gIHByaXZhdGUgX3JlbmRlclRleHQgPSB0cnVlO1xuICBwcml2YXRlIF9yZW5kZXJUZXh0TW9kZTogUmVuZGVyVGV4dE1vZGUgPSBSZW5kZXJUZXh0TW9kZS5FTkFCTEVEO1xuICBwcml2YXRlIF9zdGlja1RvUGFnZSA9IGZhbHNlO1xuICBwcml2YXRlIF9vcmlnaW5hbFNpemUgPSB0cnVlO1xuICBwcml2YXRlIF9wZGY6IFBERkRvY3VtZW50UHJveHk7XG4gIHByaXZhdGUgX3BhZ2UgPSAxO1xuICBwcml2YXRlIF96b29tID0gMTtcbiAgcHJpdmF0ZSBfem9vbVNjYWxlOiAncGFnZS1oZWlnaHQnIHwgJ3BhZ2UtZml0JyB8ICdwYWdlLXdpZHRoJyA9ICdwYWdlLXdpZHRoJztcbiAgcHJpdmF0ZSBfcm90YXRpb24gPSAwO1xuICBwcml2YXRlIF9zaG93QWxsID0gdHJ1ZTtcbiAgcHJpdmF0ZSBfY2FuQXV0b1Jlc2l6ZSA9IHRydWU7XG4gIHByaXZhdGUgX2ZpdFRvUGFnZSA9IGZhbHNlO1xuICBwcml2YXRlIF9leHRlcm5hbExpbmtUYXJnZXQgPSAnYmxhbmsnO1xuICBwcml2YXRlIF9zaG93Qm9yZGVycyA9IGZhbHNlO1xuICBwcml2YXRlIGxhc3RMb2FkZWQ6IHN0cmluZyB8IFVpbnQ4QXJyYXkgfCBQREZTb3VyY2U7XG4gIHByaXZhdGUgX2xhdGVzdFNjcm9sbGVkUGFnZTogbnVtYmVyO1xuXG4gIHByaXZhdGUgcmVzaXplVGltZW91dDogTm9kZUpTLlRpbWVyO1xuICBwcml2YXRlIHBhZ2VTY3JvbGxUaW1lb3V0OiBOb2RlSlMuVGltZXI7XG4gIHByaXZhdGUgaXNJbml0aWFsaXplZCA9IGZhbHNlO1xuICBwcml2YXRlIGxvYWRpbmdUYXNrOiBhbnk7XG4gIHByaXZhdGUgZGVzdHJveSQgPSBuZXcgU3ViamVjdDx2b2lkPigpO1xuXG4gIEBPdXRwdXQoJ2FmdGVyLWxvYWQtY29tcGxldGUnKSBhZnRlckxvYWRDb21wbGV0ZSA9IG5ldyBFdmVudEVtaXR0ZXI8UERGRG9jdW1lbnRQcm94eT4oKTtcbiAgQE91dHB1dCgncGFnZS1yZW5kZXJlZCcpIHBhZ2VSZW5kZXJlZCA9IG5ldyBFdmVudEVtaXR0ZXI8Q3VzdG9tRXZlbnQ+KCk7XG4gIEBPdXRwdXQoJ3BhZ2VzLWluaXRpYWxpemVkJykgcGFnZUluaXRpYWxpemVkID0gbmV3IEV2ZW50RW1pdHRlcjxDdXN0b21FdmVudD4oKTtcbiAgQE91dHB1dCgndGV4dC1sYXllci1yZW5kZXJlZCcpIHRleHRMYXllclJlbmRlcmVkID0gbmV3IEV2ZW50RW1pdHRlcjxDdXN0b21FdmVudD4oKTtcbiAgQE91dHB1dCgnZXJyb3InKSBvbkVycm9yID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIEBPdXRwdXQoJ29uLXByb2dyZXNzJykgb25Qcm9ncmVzcyA9IG5ldyBFdmVudEVtaXR0ZXI8UERGUHJvZ3Jlc3NEYXRhPigpO1xuICBAT3V0cHV0KCkgcGFnZUNoYW5nZTogRXZlbnRFbWl0dGVyPG51bWJlcj4gPSBuZXcgRXZlbnRFbWl0dGVyPG51bWJlcj4odHJ1ZSk7XG4gIEBJbnB1dCgpIHNyYzogc3RyaW5nIHwgVWludDhBcnJheSB8IFBERlNvdXJjZTtcblxuICBASW5wdXQoJ2MtbWFwcy11cmwnKVxuICBzZXQgY01hcHNVcmwoY01hcHNVcmw6IHN0cmluZykge1xuICAgIHRoaXMuX2NNYXBzVXJsID0gY01hcHNVcmw7XG4gIH1cblxuICBASW5wdXQoJ3BhZ2UnKVxuICBzZXQgcGFnZShfcGFnZSkge1xuICAgIF9wYWdlID0gcGFyc2VJbnQoX3BhZ2UsIDEwKSB8fCAxO1xuICAgIGNvbnN0IG9yaWdpbmFsUGFnZSA9IF9wYWdlO1xuXG4gICAgaWYgKHRoaXMuX3BkZikge1xuICAgICAgX3BhZ2UgPSB0aGlzLmdldFZhbGlkUGFnZU51bWJlcihfcGFnZSk7XG4gICAgfVxuXG4gICAgdGhpcy5fcGFnZSA9IF9wYWdlO1xuICAgIGlmIChvcmlnaW5hbFBhZ2UgIT09IF9wYWdlKSB7XG4gICAgICB0aGlzLnBhZ2VDaGFuZ2UuZW1pdChfcGFnZSk7XG4gICAgfVxuICB9XG5cbiAgQElucHV0KCdyZW5kZXItdGV4dCcpXG4gIHNldCByZW5kZXJUZXh0KHJlbmRlclRleHQ6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9yZW5kZXJUZXh0ID0gcmVuZGVyVGV4dDtcbiAgfVxuXG4gIEBJbnB1dCgncmVuZGVyLXRleHQtbW9kZScpXG4gIHNldCByZW5kZXJUZXh0TW9kZShyZW5kZXJUZXh0TW9kZTogUmVuZGVyVGV4dE1vZGUpIHtcbiAgICB0aGlzLl9yZW5kZXJUZXh0TW9kZSA9IHJlbmRlclRleHRNb2RlO1xuICB9XG5cbiAgQElucHV0KCdvcmlnaW5hbC1zaXplJylcbiAgc2V0IG9yaWdpbmFsU2l6ZShvcmlnaW5hbFNpemU6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9vcmlnaW5hbFNpemUgPSBvcmlnaW5hbFNpemU7XG4gIH1cblxuICBASW5wdXQoJ3Nob3ctYWxsJylcbiAgc2V0IHNob3dBbGwodmFsdWU6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9zaG93QWxsID0gdmFsdWU7XG4gIH1cblxuICBASW5wdXQoJ3N0aWNrLXRvLXBhZ2UnKVxuICBzZXQgc3RpY2tUb1BhZ2UodmFsdWU6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9zdGlja1RvUGFnZSA9IHZhbHVlO1xuICB9XG5cbiAgQElucHV0KCd6b29tJylcbiAgc2V0IHpvb20odmFsdWU6IG51bWJlcikge1xuICAgIGlmICh2YWx1ZSA8PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fem9vbSA9IHZhbHVlO1xuICB9XG5cbiAgZ2V0IHpvb20oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3pvb207XG4gIH1cblxuICBASW5wdXQoJ3pvb20tc2NhbGUnKVxuICBzZXQgem9vbVNjYWxlKHZhbHVlOiAncGFnZS1oZWlnaHQnIHwgJ3BhZ2UtZml0JyB8ICdwYWdlLXdpZHRoJykge1xuICAgIHRoaXMuX3pvb21TY2FsZSA9IHZhbHVlO1xuICB9XG5cbiAgZ2V0IHpvb21TY2FsZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fem9vbVNjYWxlO1xuICB9XG5cbiAgQElucHV0KCdyb3RhdGlvbicpXG4gIHNldCByb3RhdGlvbih2YWx1ZTogbnVtYmVyKSB7XG4gICAgaWYgKCEodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiB2YWx1ZSAlIDkwID09PSAwKSkge1xuICAgICAgY29uc29sZS53YXJuKCdJbnZhbGlkIHBhZ2VzIHJvdGF0aW9uIGFuZ2xlLicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX3JvdGF0aW9uID0gdmFsdWU7XG4gIH1cblxuICBASW5wdXQoJ2V4dGVybmFsLWxpbmstdGFyZ2V0JylcbiAgc2V0IGV4dGVybmFsTGlua1RhcmdldCh2YWx1ZTogc3RyaW5nKSB7XG4gICAgdGhpcy5fZXh0ZXJuYWxMaW5rVGFyZ2V0ID0gdmFsdWU7XG4gIH1cblxuICBASW5wdXQoJ2F1dG9yZXNpemUnKVxuICBzZXQgYXV0b3Jlc2l6ZSh2YWx1ZTogYm9vbGVhbikge1xuICAgIHRoaXMuX2NhbkF1dG9SZXNpemUgPSBCb29sZWFuKHZhbHVlKTtcbiAgfVxuXG4gIEBJbnB1dCgnZml0LXRvLXBhZ2UnKVxuICBzZXQgZml0VG9QYWdlKHZhbHVlOiBib29sZWFuKSB7XG4gICAgdGhpcy5fZml0VG9QYWdlID0gQm9vbGVhbih2YWx1ZSk7XG4gIH1cblxuICBASW5wdXQoJ3Nob3ctYm9yZGVycycpXG4gIHNldCBzaG93Qm9yZGVycyh2YWx1ZTogYm9vbGVhbikge1xuICAgIHRoaXMuX3Nob3dCb3JkZXJzID0gQm9vbGVhbih2YWx1ZSk7XG4gIH1cblxuICBzdGF0aWMgZ2V0TGlua1RhcmdldCh0eXBlOiBzdHJpbmcpIHtcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ2JsYW5rJzpcbiAgICAgICAgcmV0dXJuIChQREZKUyBhcyBhbnkpLkxpbmtUYXJnZXQuQkxBTks7XG4gICAgICBjYXNlICdub25lJzpcbiAgICAgICAgcmV0dXJuIChQREZKUyBhcyBhbnkpLkxpbmtUYXJnZXQuTk9ORTtcbiAgICAgIGNhc2UgJ3NlbGYnOlxuICAgICAgICByZXR1cm4gKFBERkpTIGFzIGFueSkuTGlua1RhcmdldC5TRUxGO1xuICAgICAgY2FzZSAncGFyZW50JzpcbiAgICAgICAgcmV0dXJuIChQREZKUyBhcyBhbnkpLkxpbmtUYXJnZXQuUEFSRU5UO1xuICAgICAgY2FzZSAndG9wJzpcbiAgICAgICAgcmV0dXJuIChQREZKUyBhcyBhbnkpLkxpbmtUYXJnZXQuVE9QO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBlbGVtZW50OiBFbGVtZW50UmVmKSB7XG4gICAgaWYgKGlzU1NSKCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgcGRmV29ya2VyU3JjOiBzdHJpbmc7XG5cbiAgICBpZiAoXG4gICAgICB3aW5kb3cuaGFzT3duUHJvcGVydHkoJ3BkZldvcmtlclNyYycpICYmXG4gICAgICB0eXBlb2YgKHdpbmRvdyBhcyBhbnkpLnBkZldvcmtlclNyYyA9PT0gJ3N0cmluZycgJiZcbiAgICAgICh3aW5kb3cgYXMgYW55KS5wZGZXb3JrZXJTcmNcbiAgICApIHtcbiAgICAgIHBkZldvcmtlclNyYyA9ICh3aW5kb3cgYXMgYW55KS5wZGZXb3JrZXJTcmM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBkZldvcmtlclNyYyA9IGBodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL3BkZmpzLWRpc3RAJHsoUERGSlMgYXMgYW55KS52ZXJzaW9uXG4gICAgICAgIH0vZXM1L2J1aWxkL3BkZi53b3JrZXIuanNgO1xuICAgIH1cblxuICAgIGFzc2lnbihQREZKUy5HbG9iYWxXb3JrZXJPcHRpb25zLCBcIndvcmtlclNyY1wiLCBwZGZXb3JrZXJTcmMpO1xuICB9XG5cbiAgbmdBZnRlclZpZXdDaGVja2VkKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBvZmZzZXQgPSB0aGlzLnBkZlZpZXdlckNvbnRhaW5lci5uYXRpdmVFbGVtZW50Lm9mZnNldFBhcmVudDtcblxuICAgIGlmICh0aGlzLmlzVmlzaWJsZSA9PT0gdHJ1ZSAmJiBvZmZzZXQgPT0gbnVsbCkge1xuICAgICAgdGhpcy5pc1Zpc2libGUgPSBmYWxzZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc1Zpc2libGUgPT09IGZhbHNlICYmIG9mZnNldCAhPSBudWxsKSB7XG4gICAgICB0aGlzLmlzVmlzaWJsZSA9IHRydWU7XG5cbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLm5nT25Jbml0KCk7XG4gICAgICAgIHRoaXMubmdPbkNoYW5nZXMoeyBzcmM6IHRoaXMuc3JjIH0gYXMgYW55KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIGlmICghaXNTU1IoKSAmJiB0aGlzLmlzVmlzaWJsZSkge1xuICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuc2V0dXBNdWx0aVBhZ2VWaWV3ZXIoKTtcbiAgICAgIHRoaXMuc2V0dXBTaW5nbGVQYWdlVmlld2VyKCk7XG4gICAgfVxuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgdGhpcy5jbGVhcigpO1xuICAgIHRoaXMuZGVzdHJveSQubmV4dCgpO1xuICAgIHRoaXMubG9hZGluZ1Rhc2sgPSBudWxsO1xuICB9XG5cbiAgQEhvc3RMaXN0ZW5lcignd2luZG93OnJlc2l6ZScsIFtdKVxuICBwdWJsaWMgb25QYWdlUmVzaXplKCkge1xuICAgIGlmICghdGhpcy5fY2FuQXV0b1Jlc2l6ZSB8fCAhdGhpcy5fcGRmKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucmVzaXplVGltZW91dCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMucmVzaXplVGltZW91dCk7XG4gICAgfVxuXG4gICAgdGhpcy5yZXNpemVUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLnVwZGF0ZVNpemUoKTtcbiAgICB9LCAxMDApO1xuICB9XG5cbiAgZ2V0IHBkZkxpbmtTZXJ2aWNlKCk6IGFueSB7XG4gICAgcmV0dXJuIHRoaXMuX3Nob3dBbGxcbiAgICAgID8gdGhpcy5wZGZNdWx0aVBhZ2VMaW5rU2VydmljZVxuICAgICAgOiB0aGlzLnBkZlNpbmdsZVBhZ2VMaW5rU2VydmljZTtcbiAgfVxuXG4gIGdldCBwZGZWaWV3ZXIoKTogYW55IHtcbiAgICByZXR1cm4gdGhpcy5nZXRDdXJyZW50Vmlld2VyKCk7XG4gIH1cblxuICBnZXQgcGRmRmluZENvbnRyb2xsZXIoKTogYW55IHtcbiAgICByZXR1cm4gdGhpcy5fc2hvd0FsbFxuICAgICAgPyB0aGlzLnBkZk11bHRpUGFnZUZpbmRDb250cm9sbGVyXG4gICAgICA6IHRoaXMucGRmU2luZ2xlUGFnZUZpbmRDb250cm9sbGVyO1xuICB9XG5cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcykge1xuICAgIGlmIChpc1NTUigpIHx8ICF0aGlzLmlzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICgnc3JjJyBpbiBjaGFuZ2VzKSB7XG4gICAgICB0aGlzLmxvYWRQREYoKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX3BkZikge1xuICAgICAgaWYgKCdyZW5kZXJUZXh0JyBpbiBjaGFuZ2VzKSB7XG4gICAgICAgIHRoaXMuZ2V0Q3VycmVudFZpZXdlcigpLnRleHRMYXllck1vZGUgPSB0aGlzLl9yZW5kZXJUZXh0XG4gICAgICAgICAgPyB0aGlzLl9yZW5kZXJUZXh0TW9kZVxuICAgICAgICAgIDogUmVuZGVyVGV4dE1vZGUuRElTQUJMRUQ7XG4gICAgICAgIHRoaXMucmVzZXRQZGZEb2N1bWVudCgpO1xuICAgICAgfSBlbHNlIGlmICgnc2hvd0FsbCcgaW4gY2hhbmdlcykge1xuICAgICAgICB0aGlzLnJlc2V0UGRmRG9jdW1lbnQoKTtcbiAgICAgIH1cbiAgICAgIGlmICgncGFnZScgaW4gY2hhbmdlcykge1xuICAgICAgICBjb25zdCB7IHBhZ2UgfSA9IGNoYW5nZXM7XG4gICAgICAgIGlmIChwYWdlLmN1cnJlbnRWYWx1ZSA9PT0gdGhpcy5fbGF0ZXN0U2Nyb2xsZWRQYWdlKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTmV3IGZvcm0gb2YgcGFnZSBjaGFuZ2luZzogVGhlIHZpZXdlciB3aWxsIG5vdyBqdW1wIHRvIHRoZSBzcGVjaWZpZWQgcGFnZSB3aGVuIGl0IGlzIGNoYW5nZWQuXG4gICAgICAgIC8vIFRoaXMgYmVoYXZpb3IgaXMgaW50cm9kdWNlZCBieSB1c2luZyB0aGUgUERGU2luZ2xlUGFnZVZpZXdlclxuICAgICAgICB0aGlzLmdldEN1cnJlbnRWaWV3ZXIoKS5zY3JvbGxQYWdlSW50b1ZpZXcoeyBwYWdlTnVtYmVyOiB0aGlzLl9wYWdlIH0pO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyB1cGRhdGVTaXplKCkge1xuICAgIGNvbnN0IGN1cnJlbnRWaWV3ZXIgPSB0aGlzLmdldEN1cnJlbnRWaWV3ZXIoKTtcblxuICAgIGZyb20oXG4gICAgICAodGhpcy5fcGRmLmdldFBhZ2UoXG4gICAgICAgIGN1cnJlbnRWaWV3ZXIuY3VycmVudFBhZ2VOdW1iZXJcbiAgICAgICkgYXMgYW55KSBhcyBQcm9taXNlPFBERlBhZ2VQcm94eT5cbiAgICApXG4gICAgICAucGlwZSh0YWtlVW50aWwodGhpcy5kZXN0cm95JCkpXG4gICAgICAuc3Vic2NyaWJlKHtcbiAgICAgICAgbmV4dDogKHBhZ2U6IFBERlBhZ2VQcm94eSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJvdGF0aW9uID0gdGhpcy5fcm90YXRpb24gfHwgcGFnZS5yb3RhdGU7XG4gICAgICAgICAgY29uc3Qgdmlld3BvcnRXaWR0aCA9XG4gICAgICAgICAgICAocGFnZSBhcyBhbnkpLmdldFZpZXdwb3J0KHtcbiAgICAgICAgICAgICAgc2NhbGU6IHRoaXMuX3pvb20sXG4gICAgICAgICAgICAgIHJvdGF0aW9uXG4gICAgICAgICAgICB9KS53aWR0aCAqIFBkZlZpZXdlckNvbXBvbmVudC5DU1NfVU5JVFM7XG4gICAgICAgICAgbGV0IHNjYWxlID0gdGhpcy5fem9vbTtcbiAgICAgICAgICBsZXQgc3RpY2tUb1BhZ2UgPSB0cnVlO1xuXG4gICAgICAgICAgLy8gU2NhbGUgdGhlIGRvY3VtZW50IHdoZW4gaXQgc2hvdWxkbid0IGJlIGluIG9yaWdpbmFsIHNpemUgb3IgZG9lc24ndCBmaXQgaW50byB0aGUgdmlld3BvcnRcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAhdGhpcy5fb3JpZ2luYWxTaXplIHx8XG4gICAgICAgICAgICAodGhpcy5fZml0VG9QYWdlICYmXG4gICAgICAgICAgICAgIHZpZXdwb3J0V2lkdGggPiB0aGlzLnBkZlZpZXdlckNvbnRhaW5lci5uYXRpdmVFbGVtZW50LmNsaWVudFdpZHRoKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgY29uc3Qgdmlld1BvcnQgPSAocGFnZSBhcyBhbnkpLmdldFZpZXdwb3J0KHsgc2NhbGU6IDEsIHJvdGF0aW9uIH0pO1xuICAgICAgICAgICAgc2NhbGUgPSB0aGlzLmdldFNjYWxlKHZpZXdQb3J0LndpZHRoLCB2aWV3UG9ydC5oZWlnaHQpO1xuICAgICAgICAgICAgc3RpY2tUb1BhZ2UgPSAhdGhpcy5fc3RpY2tUb1BhZ2U7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY3VycmVudFZpZXdlci5fc2V0U2NhbGUoc2NhbGUsIHN0aWNrVG9QYWdlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIH1cblxuICBwdWJsaWMgY2xlYXIoKSB7XG4gICAgaWYgKHRoaXMubG9hZGluZ1Rhc2sgJiYgIXRoaXMubG9hZGluZ1Rhc2suZGVzdHJveWVkKSB7XG4gICAgICB0aGlzLmxvYWRpbmdUYXNrLmRlc3Ryb3koKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGRmKSB7XG4gICAgICB0aGlzLl9wZGYuZGVzdHJveSgpO1xuICAgICAgdGhpcy5fcGRmID0gbnVsbDtcbiAgICAgIHRoaXMucGRmTXVsdGlQYWdlVmlld2VyLnNldERvY3VtZW50KG51bGwpO1xuICAgICAgdGhpcy5wZGZTaW5nbGVQYWdlVmlld2VyLnNldERvY3VtZW50KG51bGwpO1xuXG4gICAgICB0aGlzLnBkZk11bHRpUGFnZUxpbmtTZXJ2aWNlLnNldERvY3VtZW50KG51bGwsIG51bGwpO1xuICAgICAgdGhpcy5wZGZTaW5nbGVQYWdlTGlua1NlcnZpY2Uuc2V0RG9jdW1lbnQobnVsbCwgbnVsbCk7XG5cbiAgICAgIHRoaXMucGRmTXVsdGlQYWdlRmluZENvbnRyb2xsZXIuc2V0RG9jdW1lbnQobnVsbCk7XG4gICAgICB0aGlzLnBkZlNpbmdsZVBhZ2VGaW5kQ29udHJvbGxlci5zZXREb2N1bWVudChudWxsKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFBERkxpbmtTZXJ2aWNlQ29uZmlnKCkge1xuICAgIGNvbnN0IHBkZkxpbmtTZXJ2aWNlQ29uZmlnOiBhbnkgPSB7fTtcbiAgICBjb25zdCBsaW5rVGFyZ2V0ID0gUGRmVmlld2VyQ29tcG9uZW50LmdldExpbmtUYXJnZXQodGhpcy5fZXh0ZXJuYWxMaW5rVGFyZ2V0KTtcblxuICAgIGlmIChsaW5rVGFyZ2V0KSB7XG4gICAgICBwZGZMaW5rU2VydmljZUNvbmZpZy5leHRlcm5hbExpbmtUYXJnZXQgPSBsaW5rVGFyZ2V0O1xuICAgIH1cblxuICAgIHJldHVybiBwZGZMaW5rU2VydmljZUNvbmZpZztcbiAgfVxuXG4gIHByaXZhdGUgc2V0dXBNdWx0aVBhZ2VWaWV3ZXIoKSB7XG4gICAgYXNzaWduKFBERkpTLCBcImRpc2FibGVUZXh0TGF5ZXJcIiwgIXRoaXMuX3JlbmRlclRleHQpO1xuXG4gICAgY29uc3QgZXZlbnRCdXMgPSBjcmVhdGVFdmVudEJ1cyhQREZKU1ZpZXdlciwgdGhpcy5kZXN0cm95JCk7XG5cbiAgICBmcm9tRXZlbnQ8Q3VzdG9tRXZlbnQ+KGV2ZW50QnVzLCAncGFnZXJlbmRlcmVkJylcbiAgICAgIC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSlcbiAgICAgIC5zdWJzY3JpYmUoKGV2ZW50KSA9PiB7XG4gICAgICAgIHRoaXMucGFnZVJlbmRlcmVkLmVtaXQoZXZlbnQpO1xuICAgICAgfSk7XG5cbiAgICBmcm9tRXZlbnQ8Q3VzdG9tRXZlbnQ+KGV2ZW50QnVzLCAncGFnZXNpbml0JylcbiAgICAgIC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSlcbiAgICAgIC5zdWJzY3JpYmUoKGV2ZW50KSA9PiB7XG4gICAgICAgIHRoaXMucGFnZUluaXRpYWxpemVkLmVtaXQoZXZlbnQpO1xuICAgICAgfSk7XG5cbiAgICBmcm9tRXZlbnQoZXZlbnRCdXMsICdwYWdlY2hhbmdpbmcnKVxuICAgICAgLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKVxuICAgICAgLnN1YnNjcmliZSgoeyBwYWdlTnVtYmVyIH0pID0+IHtcbiAgICAgICAgaWYgKHRoaXMucGFnZVNjcm9sbFRpbWVvdXQpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5wYWdlU2Nyb2xsVGltZW91dCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnBhZ2VTY3JvbGxUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5fbGF0ZXN0U2Nyb2xsZWRQYWdlID0gcGFnZU51bWJlcjtcbiAgICAgICAgICB0aGlzLnBhZ2VDaGFuZ2UuZW1pdChwYWdlTnVtYmVyKTtcbiAgICAgICAgfSwgMTAwKTtcbiAgICAgIH0pO1xuXG4gICAgZnJvbUV2ZW50PEN1c3RvbUV2ZW50PihldmVudEJ1cywgJ3RleHRsYXllcnJlbmRlcmVkJylcbiAgICAgIC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSlcbiAgICAgIC5zdWJzY3JpYmUoKGV2ZW50KSA9PiB7XG4gICAgICAgIHRoaXMudGV4dExheWVyUmVuZGVyZWQuZW1pdChldmVudCk7XG4gICAgICB9KTtcblxuICAgIHRoaXMucGRmTXVsdGlQYWdlTGlua1NlcnZpY2UgPSBuZXcgUERGSlNWaWV3ZXIuUERGTGlua1NlcnZpY2Uoe1xuICAgICAgZXZlbnRCdXMsIC4uLnRoaXMuZ2V0UERGTGlua1NlcnZpY2VDb25maWcoKVxuICAgIH0pO1xuICAgIHRoaXMucGRmTXVsdGlQYWdlRmluZENvbnRyb2xsZXIgPSBuZXcgUERGSlNWaWV3ZXIuUERGRmluZENvbnRyb2xsZXIoe1xuICAgICAgbGlua1NlcnZpY2U6IHRoaXMucGRmTXVsdGlQYWdlTGlua1NlcnZpY2UsXG4gICAgICBldmVudEJ1c1xuICAgIH0pO1xuXG4gICAgY29uc3QgcGRmT3B0aW9uczogUERGVmlld2VyUGFyYW1zIHwgYW55ID0ge1xuICAgICAgZXZlbnRCdXMsXG4gICAgICBjb250YWluZXI6IHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ2RpdicpLFxuICAgICAgcmVtb3ZlUGFnZUJvcmRlcnM6ICF0aGlzLl9zaG93Qm9yZGVycyxcbiAgICAgIGxpbmtTZXJ2aWNlOiB0aGlzLnBkZk11bHRpUGFnZUxpbmtTZXJ2aWNlLFxuICAgICAgdGV4dExheWVyTW9kZTogdGhpcy5fcmVuZGVyVGV4dFxuICAgICAgICA/IHRoaXMuX3JlbmRlclRleHRNb2RlXG4gICAgICAgIDogUmVuZGVyVGV4dE1vZGUuRElTQUJMRUQsXG4gICAgICBmaW5kQ29udHJvbGxlcjogdGhpcy5wZGZNdWx0aVBhZ2VGaW5kQ29udHJvbGxlclxuICAgIH07XG5cbiAgICB0aGlzLnBkZk11bHRpUGFnZVZpZXdlciA9IG5ldyBQREZKU1ZpZXdlci5QREZWaWV3ZXIocGRmT3B0aW9ucyk7XG4gICAgdGhpcy5wZGZNdWx0aVBhZ2VMaW5rU2VydmljZS5zZXRWaWV3ZXIodGhpcy5wZGZNdWx0aVBhZ2VWaWV3ZXIpO1xuICAgIHRoaXMucGRmTXVsdGlQYWdlRmluZENvbnRyb2xsZXIuc2V0RG9jdW1lbnQodGhpcy5fcGRmKTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0dXBTaW5nbGVQYWdlVmlld2VyKCkge1xuICAgIGFzc2lnbihQREZKUywgXCJkaXNhYmxlVGV4dExheWVyXCIsICF0aGlzLl9yZW5kZXJUZXh0KTtcblxuICAgIGNvbnN0IGV2ZW50QnVzID0gY3JlYXRlRXZlbnRCdXMoUERGSlNWaWV3ZXIsIHRoaXMuZGVzdHJveSQpO1xuXG4gICAgZnJvbUV2ZW50KGV2ZW50QnVzLCAncGFnZWNoYW5naW5nJylcbiAgICAgIC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSlcbiAgICAgIC5zdWJzY3JpYmUoKHsgcGFnZU51bWJlciB9KSA9PiB7XG4gICAgICAgIGlmIChwYWdlTnVtYmVyICE9PSB0aGlzLl9wYWdlKSB7XG4gICAgICAgICAgdGhpcy5wYWdlID0gcGFnZU51bWJlcjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICBmcm9tRXZlbnQ8Q3VzdG9tRXZlbnQ+KGV2ZW50QnVzLCAncGFnZXJlbmRlcmVkJylcbiAgICAgIC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSlcbiAgICAgIC5zdWJzY3JpYmUoKGV2ZW50KSA9PiB7XG4gICAgICAgIHRoaXMucGFnZVJlbmRlcmVkLmVtaXQoZXZlbnQpO1xuICAgICAgfSk7XG5cbiAgICBmcm9tRXZlbnQ8Q3VzdG9tRXZlbnQ+KGV2ZW50QnVzLCAncGFnZXNpbml0JylcbiAgICAgIC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSlcbiAgICAgIC5zdWJzY3JpYmUoKGV2ZW50KSA9PiB7XG4gICAgICAgIHRoaXMucGFnZUluaXRpYWxpemVkLmVtaXQoZXZlbnQpO1xuICAgICAgfSk7XG5cbiAgICBmcm9tRXZlbnQ8Q3VzdG9tRXZlbnQ+KGV2ZW50QnVzLCAndGV4dGxheWVycmVuZGVyZWQnKVxuICAgICAgLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKVxuICAgICAgLnN1YnNjcmliZSgoZXZlbnQpID0+IHtcbiAgICAgICAgdGhpcy50ZXh0TGF5ZXJSZW5kZXJlZC5lbWl0KGV2ZW50KTtcbiAgICAgIH0pO1xuXG4gICAgdGhpcy5wZGZTaW5nbGVQYWdlTGlua1NlcnZpY2UgPSBuZXcgUERGSlNWaWV3ZXIuUERGTGlua1NlcnZpY2Uoe1xuICAgICAgZXZlbnRCdXMsIC4uLnRoaXMuZ2V0UERGTGlua1NlcnZpY2VDb25maWcoKVxuICAgIH0pO1xuICAgIHRoaXMucGRmU2luZ2xlUGFnZUZpbmRDb250cm9sbGVyID0gbmV3IFBERkpTVmlld2VyLlBERkZpbmRDb250cm9sbGVyKHtcbiAgICAgIGxpbmtTZXJ2aWNlOiB0aGlzLnBkZlNpbmdsZVBhZ2VMaW5rU2VydmljZSxcbiAgICAgIGV2ZW50QnVzXG4gICAgfSk7XG5cbiAgICBjb25zdCBwZGZPcHRpb25zOiBQREZWaWV3ZXJQYXJhbXMgfCBhbnkgPSB7XG4gICAgICBldmVudEJ1cyxcbiAgICAgIGNvbnRhaW5lcjogdGhpcy5lbGVtZW50Lm5hdGl2ZUVsZW1lbnQucXVlcnlTZWxlY3RvcignZGl2JyksXG4gICAgICByZW1vdmVQYWdlQm9yZGVyczogIXRoaXMuX3Nob3dCb3JkZXJzLFxuICAgICAgbGlua1NlcnZpY2U6IHRoaXMucGRmU2luZ2xlUGFnZUxpbmtTZXJ2aWNlLFxuICAgICAgdGV4dExheWVyTW9kZTogdGhpcy5fcmVuZGVyVGV4dFxuICAgICAgICA/IHRoaXMuX3JlbmRlclRleHRNb2RlXG4gICAgICAgIDogUmVuZGVyVGV4dE1vZGUuRElTQUJMRUQsXG4gICAgICBmaW5kQ29udHJvbGxlcjogdGhpcy5wZGZTaW5nbGVQYWdlRmluZENvbnRyb2xsZXJcbiAgICB9O1xuXG4gICAgdGhpcy5wZGZTaW5nbGVQYWdlVmlld2VyID0gbmV3IFBERkpTVmlld2VyLlBERlNpbmdsZVBhZ2VWaWV3ZXIocGRmT3B0aW9ucyk7XG4gICAgdGhpcy5wZGZTaW5nbGVQYWdlTGlua1NlcnZpY2Uuc2V0Vmlld2VyKHRoaXMucGRmU2luZ2xlUGFnZVZpZXdlcik7XG4gICAgdGhpcy5wZGZTaW5nbGVQYWdlRmluZENvbnRyb2xsZXIuc2V0RG9jdW1lbnQodGhpcy5fcGRmKTtcblxuICAgIHRoaXMucGRmU2luZ2xlUGFnZVZpZXdlci5fY3VycmVudFBhZ2VOdW1iZXIgPSB0aGlzLl9wYWdlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRWYWxpZFBhZ2VOdW1iZXIocGFnZTogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBpZiAocGFnZSA8IDEpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGlmIChwYWdlID4gdGhpcy5fcGRmLm51bVBhZ2VzKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGRmLm51bVBhZ2VzO1xuICAgIH1cblxuICAgIHJldHVybiBwYWdlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREb2N1bWVudFBhcmFtcygpIHtcbiAgICBjb25zdCBzcmNUeXBlID0gdHlwZW9mIHRoaXMuc3JjO1xuXG4gICAgaWYgKCF0aGlzLl9jTWFwc1VybCkge1xuICAgICAgcmV0dXJuIHRoaXMuc3JjO1xuICAgIH1cblxuICAgIGNvbnN0IHBhcmFtczogYW55ID0ge1xuICAgICAgY01hcFVybDogdGhpcy5fY01hcHNVcmwsXG4gICAgICBjTWFwUGFja2VkOiB0cnVlXG4gICAgfTtcblxuICAgIGlmIChzcmNUeXBlID09PSAnc3RyaW5nJykge1xuICAgICAgcGFyYW1zLnVybCA9IHRoaXMuc3JjO1xuICAgIH0gZWxzZSBpZiAoc3JjVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmICgodGhpcy5zcmMgYXMgYW55KS5ieXRlTGVuZ3RoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcGFyYW1zLmRhdGEgPSB0aGlzLnNyYztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ocGFyYW1zLCB0aGlzLnNyYyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcmFtcztcbiAgfVxuXG4gIHByaXZhdGUgbG9hZFBERigpIHtcbiAgICBpZiAoIXRoaXMuc3JjKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMubGFzdExvYWRlZCA9PT0gdGhpcy5zcmMpIHtcbiAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5jbGVhcigpO1xuXG4gICAgdGhpcy5sb2FkaW5nVGFzayA9IChQREZKUyBhcyBhbnkpLmdldERvY3VtZW50KHRoaXMuZ2V0RG9jdW1lbnRQYXJhbXMoKSk7XG5cbiAgICB0aGlzLmxvYWRpbmdUYXNrLm9uUHJvZ3Jlc3MgPSAocHJvZ3Jlc3NEYXRhOiBQREZQcm9ncmVzc0RhdGEpID0+IHtcbiAgICAgIHRoaXMub25Qcm9ncmVzcy5lbWl0KHByb2dyZXNzRGF0YSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHNyYyA9IHRoaXMuc3JjO1xuXG4gICAgZnJvbSh0aGlzLmxvYWRpbmdUYXNrLnByb21pc2UgYXMgUHJvbWlzZTxQREZEb2N1bWVudFByb3h5PilcbiAgICAgIC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSlcbiAgICAgIC5zdWJzY3JpYmUoe1xuICAgICAgICBuZXh0OiAocGRmKSA9PiB7XG4gICAgICAgICAgdGhpcy5fcGRmID0gcGRmO1xuICAgICAgICAgIHRoaXMubGFzdExvYWRlZCA9IHNyYztcblxuICAgICAgICAgIHRoaXMuYWZ0ZXJMb2FkQ29tcGxldGUuZW1pdChwZGYpO1xuXG4gICAgICAgICAgaWYgKCF0aGlzLnBkZk11bHRpUGFnZVZpZXdlcikge1xuICAgICAgICAgICAgdGhpcy5zZXR1cE11bHRpUGFnZVZpZXdlcigpO1xuICAgICAgICAgICAgdGhpcy5zZXR1cFNpbmdsZVBhZ2VWaWV3ZXIoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLnJlc2V0UGRmRG9jdW1lbnQoKTtcblxuICAgICAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiAoZXJyb3IpID0+IHtcbiAgICAgICAgICB0aGlzLm9uRXJyb3IuZW1pdChlcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGUoKSB7XG4gICAgdGhpcy5wYWdlID0gdGhpcy5fcGFnZTtcblxuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlcigpIHtcbiAgICB0aGlzLl9wYWdlID0gdGhpcy5nZXRWYWxpZFBhZ2VOdW1iZXIodGhpcy5fcGFnZSk7XG4gICAgY29uc3QgY3VycmVudFZpZXdlciA9IHRoaXMuZ2V0Q3VycmVudFZpZXdlcigpO1xuXG4gICAgaWYgKFxuICAgICAgdGhpcy5fcm90YXRpb24gIT09IDAgfHxcbiAgICAgIGN1cnJlbnRWaWV3ZXIucGFnZXNSb3RhdGlvbiAhPT0gdGhpcy5fcm90YXRpb25cbiAgICApIHtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBjdXJyZW50Vmlld2VyLnBhZ2VzUm90YXRpb24gPSB0aGlzLl9yb3RhdGlvbjtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9zdGlja1RvUGFnZSkge1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGN1cnJlbnRWaWV3ZXIuY3VycmVudFBhZ2VOdW1iZXIgPSB0aGlzLl9wYWdlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy51cGRhdGVTaXplKCk7XG4gIH1cblxuICBwcml2YXRlIGdldFNjYWxlKHZpZXdwb3J0V2lkdGg6IG51bWJlciwgdmlld3BvcnRIZWlnaHQ6IG51bWJlcikge1xuICAgIGNvbnN0IGJvcmRlclNpemUgPSAodGhpcy5fc2hvd0JvcmRlcnMgPyAyICogUGRmVmlld2VyQ29tcG9uZW50LkJPUkRFUl9XSURUSCA6IDApO1xuICAgIGNvbnN0IHBkZkNvbnRhaW5lcldpZHRoID0gdGhpcy5wZGZWaWV3ZXJDb250YWluZXIubmF0aXZlRWxlbWVudC5jbGllbnRXaWR0aCAtIGJvcmRlclNpemU7XG4gICAgY29uc3QgcGRmQ29udGFpbmVySGVpZ2h0ID0gdGhpcy5wZGZWaWV3ZXJDb250YWluZXIubmF0aXZlRWxlbWVudC5jbGllbnRIZWlnaHQgLSBib3JkZXJTaXplO1xuXG4gICAgaWYgKHBkZkNvbnRhaW5lckhlaWdodCA9PT0gMCB8fCB2aWV3cG9ydEhlaWdodCA9PT0gMCB8fCBwZGZDb250YWluZXJXaWR0aCA9PT0gMCB8fCB2aWV3cG9ydFdpZHRoID09PSAwKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBsZXQgcmF0aW8gPSAxO1xuICAgIHN3aXRjaCAodGhpcy5fem9vbVNjYWxlKSB7XG4gICAgICBjYXNlICdwYWdlLWZpdCc6XG4gICAgICAgIHJhdGlvID0gTWF0aC5taW4oKHBkZkNvbnRhaW5lckhlaWdodCAvIHZpZXdwb3J0SGVpZ2h0KSwgKHBkZkNvbnRhaW5lcldpZHRoIC8gdmlld3BvcnRXaWR0aCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3BhZ2UtaGVpZ2h0JzpcbiAgICAgICAgcmF0aW8gPSAocGRmQ29udGFpbmVySGVpZ2h0IC8gdmlld3BvcnRIZWlnaHQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3BhZ2Utd2lkdGgnOlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmF0aW8gPSAocGRmQ29udGFpbmVyV2lkdGggLyB2aWV3cG9ydFdpZHRoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuICh0aGlzLl96b29tICogcmF0aW8pIC8gUGRmVmlld2VyQ29tcG9uZW50LkNTU19VTklUUztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q3VycmVudFZpZXdlcigpOiBhbnkge1xuICAgIHJldHVybiB0aGlzLl9zaG93QWxsID8gdGhpcy5wZGZNdWx0aVBhZ2VWaWV3ZXIgOiB0aGlzLnBkZlNpbmdsZVBhZ2VWaWV3ZXI7XG4gIH1cblxuICBwcml2YXRlIHJlc2V0UGRmRG9jdW1lbnQoKSB7XG4gICAgdGhpcy5wZGZGaW5kQ29udHJvbGxlci5zZXREb2N1bWVudCh0aGlzLl9wZGYpO1xuXG4gICAgaWYgKHRoaXMuX3Nob3dBbGwpIHtcbiAgICAgIHRoaXMucGRmU2luZ2xlUGFnZVZpZXdlci5zZXREb2N1bWVudChudWxsKTtcbiAgICAgIHRoaXMucGRmU2luZ2xlUGFnZUxpbmtTZXJ2aWNlLnNldERvY3VtZW50KG51bGwpO1xuXG4gICAgICB0aGlzLnBkZk11bHRpUGFnZVZpZXdlci5zZXREb2N1bWVudCh0aGlzLl9wZGYpO1xuICAgICAgdGhpcy5wZGZNdWx0aVBhZ2VMaW5rU2VydmljZS5zZXREb2N1bWVudCh0aGlzLl9wZGYsIG51bGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBkZk11bHRpUGFnZVZpZXdlci5zZXREb2N1bWVudChudWxsKTtcbiAgICAgIHRoaXMucGRmTXVsdGlQYWdlTGlua1NlcnZpY2Uuc2V0RG9jdW1lbnQobnVsbCk7XG5cbiAgICAgIHRoaXMucGRmU2luZ2xlUGFnZVZpZXdlci5zZXREb2N1bWVudCh0aGlzLl9wZGYpO1xuICAgICAgdGhpcy5wZGZTaW5nbGVQYWdlTGlua1NlcnZpY2Uuc2V0RG9jdW1lbnQodGhpcy5fcGRmLCBudWxsKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==