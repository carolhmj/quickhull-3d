const edgeTypes = {
    VISIBLE: 1,
    DELETED: 2
}

// Class that represents a half-edge data structure
class HalfEdge {
    constructor(vertex, face) {
        this.vertex = vertex;
        this.face = face;
        // this.mark = VISIBLE;
    }

    markAsDeleted() {
        this.mark = DELETED;
    }

    setNext(next) {
        this.next = next;
    }

    setPrev(prev) {
        this.prev = prev;
    }

    setTwin(twin) {
        this.twin = twin;
        twin.twin = this;
    }

    head() {
        return this.vertex;
    }

    tail() {
        return this.prev?.vertex;
    }

    oppositeFace() {
        return this.twin?.face;
    }

    length() {
        const tail = this.tail();
        if (tail != null) {
            return BABYLON.Vector3.Distance(this.head(), tail);
        } else {
            return -1;
        }
    }

    lengthSquared() {
        const tail = this.tail();
        if (tail != null) {
            return BABYLON.Vector3.DistanceSquared(this.head(), tail);
        } else {
            return -1;
        }
    }
}

export {HalfEdge};