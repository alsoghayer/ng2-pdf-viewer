/**
 * Created by vadimdez on 01/11/2016.
 */
import { NgModule } from '@angular/core';
import { PdfViewerComponent } from './pdf-viewer.component';
// declare global {
//   const PDFJS: PDFJSStatic;
// }
export { PDFJSStatic, PDFDocumentProxy, PDFViewerParams, PDFPageProxy, PDFSource, PDFProgressData, PDFPromise } from 'pdfjs-dist/build/pdf';
export class PdfViewerModule {
}
PdfViewerModule.decorators = [
    { type: NgModule, args: [{
                declarations: [PdfViewerComponent],
                exports: [PdfViewerComponent]
            },] }
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGRmLXZpZXdlci5tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvYXBwL3BkZi12aWV3ZXIvcGRmLXZpZXdlci5tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFDSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRXpDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRzVELG1CQUFtQjtBQUNuQiw4QkFBOEI7QUFDOUIsSUFBSTtBQUVKLE9BQU8sRUFDTCxXQUFXLEVBQ1gsZ0JBQWdCLEVBQ2hCLGVBQWUsRUFDZixZQUFZLEVBQ1osU0FBUyxFQUNULGVBQWUsRUFDZixVQUFVLEVBQ1gsTUFBTSxzQkFBc0IsQ0FBQztBQU05QixNQUFNLE9BQU8sZUFBZTs7O1lBSjNCLFFBQVEsU0FBQztnQkFDUixZQUFZLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQztnQkFDbEMsT0FBTyxFQUFFLENBQUMsa0JBQWtCLENBQUM7YUFDOUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIENyZWF0ZWQgYnkgdmFkaW1kZXogb24gMDEvMTEvMjAxNi5cbiAqL1xuaW1wb3J0IHsgTmdNb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHsgUGRmVmlld2VyQ29tcG9uZW50IH0gZnJvbSAnLi9wZGYtdmlld2VyLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBQREZKU1N0YXRpYyB9IGZyb20gJ3BkZmpzLWRpc3QvYnVpbGQvcGRmJztcblxuLy8gZGVjbGFyZSBnbG9iYWwge1xuLy8gICBjb25zdCBQREZKUzogUERGSlNTdGF0aWM7XG4vLyB9XG5cbmV4cG9ydCB7XG4gIFBERkpTU3RhdGljLFxuICBQREZEb2N1bWVudFByb3h5LFxuICBQREZWaWV3ZXJQYXJhbXMsXG4gIFBERlBhZ2VQcm94eSxcbiAgUERGU291cmNlLFxuICBQREZQcm9ncmVzc0RhdGEsXG4gIFBERlByb21pc2Vcbn0gZnJvbSAncGRmanMtZGlzdC9idWlsZC9wZGYnO1xuXG5ATmdNb2R1bGUoe1xuICBkZWNsYXJhdGlvbnM6IFtQZGZWaWV3ZXJDb21wb25lbnRdLFxuICBleHBvcnRzOiBbUGRmVmlld2VyQ29tcG9uZW50XVxufSlcbmV4cG9ydCBjbGFzcyBQZGZWaWV3ZXJNb2R1bGUge30iXX0=