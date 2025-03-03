/*
 * This file is part of BlueMap, licensed under the MIT License (MIT).
 *
 * Copyright (c) Blue (Lukas Rieger) <https://bluecolored.de>
 * Copyright (c) contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import {Scene} from "three";
import {alert} from "../util/Utils";
import {ShapeMarker} from "./ShapeMarker";
import {ExtrudeMarker} from "./ExtrudeMarker";
import {LineMarker} from "./LineMarker";
import {HtmlMarker} from "./HtmlMarker";
import {PoiMarker} from "./PoiMarker";

export class MarkerSet extends Scene {

    /**
     * @param id {string}
     */
    constructor(id) {
        super();
        Object.defineProperty(this, 'isMarkerSet', {value: true});

        /** @type {Map<string, MarkerSet>} */
        this.markerSets = new Map();
        /** @type {Map<string, Marker>} */
        this.markers = new Map();

        this.data = {
            id: id,
            label: id,
            toggleable: true,
            defaultHide: false,
            markerSets: [],
            markers: [],
            visible: this.visible,
        };

        Object.defineProperty(this, "visible", {
            get() { return this.data.visible },
            set(value) { this.data.visible = value }
        });
    }

    updateFromData(data) {
        // update set info
        this.data.label = data.label || this.data.id;
        this.data.toggleable = !!data.toggleable;
        this.data.defaultHide = !!data.defaultHidden;

        // update markerSets
        this.updateMarkerSetsFromData(data.markerSets);

        // update markers
        this.updateMarkersFromData(data.markers);
    }

    updateMarkerSetsFromData(data = {}, ignore = []) {
        let updatedMarkerSets = new Set(ignore);

        // add & update MarkerSets
        Object.keys(data).forEach(markerSetId => {
            if (updatedMarkerSets.has(markerSetId)) return;

            let markerSetData = data[markerSetId];
            try {
                this.updateMarkerSetFromData(markerSetId, markerSetData);
                updatedMarkerSets.add(markerSetId);
            } catch (err) {
                alert(this.events, err, "fine");
            }
        });

        // remove not updated MarkerSets
        this.markerSets.forEach((markerSet, setId) => {
            if (!updatedMarkerSets.has(setId)) {
                this.remove(markerSet);
            }
        });
    }

    updateMarkerSetFromData(markerSetId, data) {
        let markerSet = this.markerSets.get(markerSetId);

        // create new if not existent
        if (!markerSet) {
            markerSet = new MarkerSet(markerSetId);
            this.add(markerSet);

            if (data.defaultHidden) {
                markerSet.visible = false;
            }
        }

        // update
        markerSet.updateFromData(data);
    }

    updateMarkersFromData(data = {}, ignore = []) {
        let updatedMarkers = new Set(ignore);

        Object.keys(data).forEach(markerId => {
            if (updatedMarkers.has(markerId)) return;

            let markerData = data[markerId];
            try {
                this.updateMarkerFromData(markerId, markerData);
                updatedMarkers.add(markerId);
            } catch (err) {
                alert(this.events, err, "fine");
                console.debug(err);
            }
        });

        // remove not updated Markers
        this.markers.forEach((marker, markerId) => {
            if (!updatedMarkers.has(markerId)) {
                this.remove(marker);
            }
        });
    }

    updateMarkerFromData(markerId, data) {
        if (!data.type) throw new Error("marker-data has no type!");
        let marker = this.markers.get(markerId);

        // create new if not existent of wrong type
        if (!marker || marker.data.type !== data.type) {
            if (marker) this.remove(marker);

            switch (data.type) {
                case "shape" : marker = new ShapeMarker(markerId); break;
                case "extrude" : marker = new ExtrudeMarker(markerId); break;
                case "line" : marker = new LineMarker(markerId); break;
                case "html" : marker = new HtmlMarker(markerId); break;
                case "poi" : marker = new PoiMarker(markerId); break;
                default : throw new Error(`Unknown marker-type: '${data.type}'`);
            }

            this.add(marker);
        }

        // update marker
        marker.updateFromData(data);
    }

    /**
     * Removes all markers and marker-sets
     */
    clear() {
        [...this.data.markerSets].forEach(markerSet => this.remove(markerSet));
        [...this.data.markers].forEach(marker => this.remove(marker));
    }

    add(...object) {
        if (object.length === 1) { //super.add() will re-invoke this method for each array-entry if it's more than one
            let o = object[0];
            if (o.isMarkerSet && !this.markerSets.has(o.data.id)) {
                this.markerSets.set(o.data.id, o);
                this.data.markerSets.push(o.data);
            }
            if (o.isMarker && !this.markers.has(o.data.id)) {
                this.markers.set(o.data.id, o);
                this.data.markers.push(o.data);
            }
        }

        return super.add(...object);
    }

    remove(...object) {
        if (object.length === 1) { //super.remove() will re-invoke this method for each array-entry if it's more than one
            let o = object[0];
            if (o.isMarkerSet) {
                let i = this.data.markerSets.indexOf(o.data);
                if (i > -1) this.data.markerSets.splice(i, 1);
                this.markerSets.delete(o.data.id);
                o.dispose();
            }
            if (o.isMarker) {
                let i = this.data.markers.indexOf(o.data);
                if (i > -1) this.data.markers.splice(i, 1);
                this.markers.delete(o.data.id);
                o.dispose();
            }
        }

        return super.remove(...object);
    }

    dispose() {
        this.children.forEach(child => {
            if (child.dispose) child.dispose();
        });
    }

}