/**
 * Whiteboard
 */

export interface Whiteboard extends Metadata {
	name: string;
	background: string;
}

export interface WhiteboardOptions {
	name: string;
	background: string;
}

/**
 * Whiteboard Markings
 */

export interface WhiteboardMarking extends WhiteboardItem {
	started: number;
	path: Segment[];
}

export interface WhiteboardMarkingOptions extends WhiteboardItemOptions {
	started: number;
	path: Segment[];
}

export type WhiteboardShapeType = 'line' | 'arc' | 'ellipse' | 'polygon' | 'star' | 'custom';

/**
 * Whiteboard Text
 */

export interface WhiteboardText extends WhiteboardItem {
	rotation: number;
	bounds: Rectangle;
	content: string;
	font: Font;
}

export interface WhiteboardTextOptions extends WhiteboardItemOptions {
	rotation: number;
	bounds: Rectangle;
	content: string;
	font: Font;
}

/**
 * General Types
 */

export interface WhiteboardItem extends Metadata {
	style: StyleOptions;
	erased?: number;
}

export interface WhiteboardItemOptions {
	style: StyleOptions;
}

export interface Metadata {
	$key?: string;
	$exists?: () => boolean;
	created: number;
	createdBy: string;
	edits?: Edits;
}

// Key should be timestamp, value should be any property changed
export interface Edits {
	[timestamp: number]: any;
}

/**
 * Styling
 */

export interface StyleOptions {
	stroke: Stroke;
	fill: Fill;
	shadow: Shadow;
}

export interface Stroke {
	color: string;
	width: number;
	cap: string;
	join: string;
	dashOffset: number;
	scaling: boolean;
	dashArray: number[];
	miterLimit: number;
}

export interface Fill {
	color: string;
}

export interface Shadow {
	color: string;
	blur: number;
	offset: Point;
}

export interface Font {
	family: string;
	weight: number;
	size: number | string;
}

/**
 * Simple Types
 */

export interface Segment {
	point: Point;
	handleIn?: Point;
	handleOut?: Point;
}

export interface Rectangle {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface Size {
	width: number;
	height: number;
}

export interface Point {
	x: number;
	y: number;
}