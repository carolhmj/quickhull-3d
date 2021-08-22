import { Face } from "./Face.js";

// A simplex is a tetrahedron containing a list of faces
export default class Simplex {
    constructor(constructedAt) {
        this.createdAt = constructedAt;
    }

    // check if normal of face p1, p2, p3 is on the opposite direction to p
    checkNormalOpposite(p1, p2, p3, p) {
        // triangle centroid
        const c = p1.add(p2).add(p3).scale(0.333);
        // console.log('c', c);

        // line from centroid to point p
        const cp = p.subtract(c);
        // console.log('cp', cp);
        cp.normalizeToRef(cp);

        // triangle normal
        const p1p2 = p2.subtract(p1);
        const p3p1 = p3.subtract(p1);

        const n = BABYLON.Vector3.Cross(p1p2, p3p1);
        n.normalizeToRef(n);

        const angle = BABYLON.Vector3.Dot(cp, n);
        return angle < 0;
    }

    buildFromFaces(facesList) {
        if (facesList.length !== 4) {
            throw new Error("Creating a simplex with a number of faces != 4!");
        }
        this.faces = facesList;
    }

    buildFromPoints(tetr) {
        if (tetr.length !== 4) {
            throw new Error("Creating a simplex with number of points != 4!");
        }

        // let tetrs = [pts];

        let i = 0;
        const centr = tetr[0].add(tetr[1]).add(tetr[2]).add(tetr[3]).scale(0.25);
        // console.log('centr', centr);
        // Create tetrahedron faces
        const tp = tetr.map(pt => [pt.x, pt.y, pt.z]).flat();
        // console.log('pts', tp);
        const idxs = [
            0, 1, 2,
            1, 2, 3,
            0, 2, 3,
            0, 1, 3
        ];

        for (let i = 0; i < idxs.length; i += 3) {
            const isOpposite = this.checkNormalOpposite(
                tetr[idxs[i]], 
                tetr[idxs[i+1]], 
                tetr[idxs[i+2]], 
                centr);
            if (!isOpposite) {
                // reverse order of indices
                let aux = idxs[i];
                idxs[i] = idxs[i+2];
                idxs[i+2] = aux;
            }
        }

        const faces = [];
        for (let i = 0; i < idxs.length; i += 3) {
            const face = new Face();
            face.buildFromPoints(tetr[idxs[i]], tetr[idxs[i+1]], tetr[idxs[i+2]]);
            faces.push(face);
        }

        this.faces = faces;
    }

    getPoints() {
        return this.faces.map(f => f.points).flat();
    }

    getEdges() {
        return this.faces.map(f => f.halfEdges).flat();
    }

    //https://playground.babylonjs.com/#XAGD4K#15
    intersects(other) {
        for (let thisface of this.faces) {
            for (let otherface of other.faces) {
                if (thisface.intersects(otherface)) {
                    return true;
                }
            }
        }
        return false;
    }

    samePoints(other) {
        for (let thisPoint of this.getPoints()) {
            let foundPoint = false;
            for (let otherPoint of other.getPoints()) {
                if (thisPoint.equalsWithEpsilon(otherPoint)) {
                    foundPoint = true;
                }
            }
            if (!foundPoint) {
                return false;
            }
        }
        return true;
    }
}