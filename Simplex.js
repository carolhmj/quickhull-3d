// A simplex is a tetrahedron containing a list of faces
class Simplex {
    constructor() {

    }

    setFaces(facesList) {
        if (facesList.length !== 4) {
            throw new Error("Creating a simplex with a number of faces != 4!");
        }
        this.faces = facesList;
    }
}