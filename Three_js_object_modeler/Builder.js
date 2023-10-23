import { Point3D, Polygon, LinearRing, MultiSurface } from "./CityGMLGeometricModel";
import { VertexData, TriangleData } from "./graphicalModels";
import { PointData, FaceData } from "./GeometricalProxy";
import { Building, BuildingPart, ClosureSurface, WallSurface, FloorSurface, OuterFloorSurface, GroundSurface, RoofSurface } from "./CityGMLLogicalModel";
import { Controller } from "./controller";
import * as Utils from './utils/utils';

class SceneBuilder{
    constructor(){
        this.triangle_data    = {'fIndex':[], 'vIndex':[], 'tIndex':[], 'pIndex':[]};
        this.face_data        = {'tIndex':[], 'bIndex': [], 'type':[], 'planeEquation':[], 'center':[]};
        this.vertex_data      = {'position':[], 'normal':[], 'uv': [], 'fIndex': [], 'pIndex': [], 'vIndex': []};
        this.point_data       = {'vIndex': []};
        this.edge_data            = {};
        this.halfedge_data        = {};
        this.triangle_data_object = {};
        this.vertex_data_object   = {};
        this.face_data_object     = {};
        this.point_data_object    = {};
    } 
    build(Buildings, LoD, material){
        this.triangle_data    = {'fIndex':[], 'vIndex':[], 'tIndex':[], 'pIndex':[]};
        this.face_data        = {'tIndex':new Array(Polygon.maxId), 'bIndex': new Array(Polygon.maxId), 'type':new Array(Polygon.maxId), 'planeEquation':new Array(Polygon.maxId), 'center':new Array(3*Polygon.maxId)};
        this.vertex_data      = {'position':[], 'normal':[], 'uv': [], 'fIndex': [], 'pIndex': [], 'vIndex': []};
        this.point_data       = {'vIndex': new Array(Point3D.maxId)};
        this.edge_data        = {};
        this.halfedge_data    = {};

        
        Buildings.forEach(building=>{
            let boundaryThematicSurfaces = building.getBoundary();
            boundaryThematicSurfaces.forEach(thematicSurface=>{
                let type = thematicSurface.getType();
                let boundarySurfaces = thematicSurface.getLoD(LoD).surfaces;

                boundarySurfaces.forEach(polygon=>{

                    let nt = polygon.triangulation.length/3;
                    let normal = polygon.planeEquation.slice(0,3);
    
                    //this.face_data filling
                    let first_triangle_index = this.triangle_data.vIndex.length/3;
                    this.face_data.tIndex[polygon.id] = first_triangle_index;
                    this.face_data.bIndex[polygon.id] = building.id;
                    this.face_data.type[polygon.id]   = type;
                    this.face_data.planeEquation[polygon.id] = polygon.planeEquation;
    
                    for(let i=0; i<nt; i++){
                        let id_p1 = polygon.triangulation[3*i  ];
                        let id_p2 = polygon.triangulation[3*i+1];
                        let id_p3 = polygon.triangulation[3*i+2];
    
                        let p1 = polygon.find(id_p1);
                        let p2 = polygon.find(id_p2);
                        let p3 = polygon.find(id_p3);


    
                        let n_vert = this.vertex_data.position.length/3;
    
                        //this.vertex_data filling
                        this.vertex_data.position = this.vertex_data.position.concat([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z]);
                        this.vertex_data.normal   = this.vertex_data.normal.concat([normal[0], normal[1], normal[2], normal[0], normal[1], normal[2], normal[0], normal[1], normal[2]]);
                        this.vertex_data.fIndex   = this.vertex_data.fIndex.concat([polygon.id, polygon.id, polygon.id]);
                        this.vertex_data.pIndex   = this.vertex_data.pIndex.concat([p1.id, p2.id, p3.id]);
    
                        //this.point_data filling
                        if(this.point_data.vIndex[p1.id]==null){
                            this.point_data.vIndex[p1.id] = n_vert;
                        }
                        if(this.point_data.vIndex[p2.id]==null){
                            this.point_data.vIndex[p2.id] = n_vert+1;
                        }
                        if(this.point_data.vIndex[p3.id]==null){
                            this.point_data.vIndex[p3.id] = n_vert+2;
                        }
    
                        //this.triangle_data filling
                        this.triangle_data.vIndex.push(n_vert,n_vert+1,n_vert+2);
                        this.triangle_data.pIndex.push(id_p1, id_p2, id_p3);
                        this.triangle_data.fIndex.push(polygon.id);
                        //this.triangle_data.tIndex = this.triangle_data.tIndex.concat(this.findTrianglesNeighbours([id_p1, id_p2, id_p3], polygon.triangulation));
                    }
                })


            })
        })

        //Compute the centers of each face

        for(let i=0; i<this.face_data.tIndex.length; i++){
            let n=0;
            let [cx, cy, cz] = [0,0,0];
            for(let j=0; j<this.vertex_data.fIndex.length; j++){
                if(this.vertex_data.fIndex[j]==i){
                    n+=1;
                    cx+=this.vertex_data.position[3*j];
                    cy+=this.vertex_data.position[3*j+1];
                    cz+=this.vertex_data.position[3*j+2];
                }
            }
            this.face_data.center[3*i]   = cx/n;
            this.face_data.center[3*i+1] = cy/n;
            this.face_data.center[3*i+2] = cz/n;

            
        }

        //Compute the neighbours of each triangle
        let nb_t = this.triangle_data.fIndex.length;
        let globalTriangulation = [];
        
        for(let i=0; i<nb_t ;i++){
            let v1 = this.triangle_data.vIndex[3*i];
            let v2 = this.triangle_data.vIndex[3*i+1];
            let v3 = this.triangle_data.vIndex[3*i+2];
            globalTriangulation.push(this.vertex_data.pIndex[v1], this.vertex_data.pIndex[v2], this.vertex_data.pIndex[v3]);
        }
        for(let i=0; i<nb_t ;i++){
            let triangle = [globalTriangulation[3*i], globalTriangulation[3*i+1], globalTriangulation[3*i+2]];
            let neighbours = this.findTrianglesNeighbours(triangle, globalTriangulation);
            this.triangle_data.tIndex[3*i  ] = neighbours[0];
            this.triangle_data.tIndex[3*i+1] = neighbours[1];
            this.triangle_data.tIndex[3*i+2] = neighbours[2];
        }


        //And then we find the neighbours of the vertices

        
        this.vertex_data.vIndex = new Array(2*this.vertex_data.fIndex.length);

        
        for(let i=0; i<nb_t ;i++){
            let id_v1 = this.triangle_data.vIndex[3*i];
            let id_v2 = this.triangle_data.vIndex[3*i+1];
            let id_v3 = this.triangle_data.vIndex[3*i+2];

            let neighbours_v1 = this.findVertexNeighbour(0, i);
            let neighbours_v2 = this.findVertexNeighbour(1, i);
            let neighbours_v3 = this.findVertexNeighbour(2, i);

            this.vertex_data.vIndex[2*id_v1]   = neighbours_v1[0];
            this.vertex_data.vIndex[2*id_v1+1] = neighbours_v1[1];
            this.vertex_data.vIndex[2*id_v2]   = neighbours_v2[0];
            this.vertex_data.vIndex[2*id_v2+1] = neighbours_v2[1];
            this.vertex_data.vIndex[2*id_v3]   = neighbours_v3[0];
            this.vertex_data.vIndex[2*id_v3+1] = neighbours_v3[1];

        }

        this.triangle_data_object = new TriangleData(this.triangle_data.fIndex, this.triangle_data.vIndex, this.triangle_data.tIndex, material);
        this.vertex_data_object   = new VertexData(this.vertex_data.position, this.vertex_data.normal, this.vertex_data.uv, this.vertex_data.fIndex, this.vertex_data.pIndex, this.vertex_data.vIndex);
        this.face_data_object     = new FaceData(this.face_data.tIndex, this.face_data.planeEquation,this.face_data.center);
        this.point_data_object    = new PointData(this.point_data.vIndex);

    }

    getScene(){
        return (new Controller(this.vertex_data_object, this.triangle_data_object, this.face_data_object, this.point_data_object));
        
    }










    /**
     * 
     * @param {int[]} triangle : tableau des indices des points formant le triangle
     * @param {int[]} triangles_array : tableau des indices des points formant tout les triangle
     * @returns 
     */
    findTrianglesNeighbours(triangle, triangles_array){
        let neighbours = [null,null,null];

        let nb_neighbours = 0;
        

        for(let i=0; i<triangles_array.length/3; i++){
            let common_pts = [false, false, false];

            let common1 = triangle.indexOf(triangles_array[3*i  ]);
            let common2 = triangle.indexOf(triangles_array[3*i+1]);
            let common3 = triangle.indexOf(triangles_array[3*i+2]);

            if(common1!=-1){
                common_pts[common1] = true;
            }
            if(common2!=-1){
                common_pts[common2] = true;
            }
            if(common3!=-1){
                common_pts[common3] = true;
            }
            

            //Pour savoir de quel "côté" du triangle se trouve le voisin, on stocke l'indice du voisin
            //à l'indice correspondant au point opposé au voisin 
            //ex : on stocke dans la case 2 le voisin collé sur l'arrête 0-1, car le point 2 est le point qui lui est opposé.
            if(common_pts[0]&&common_pts[1]&&(!common_pts[2])){
                neighbours[2] = i;
                nb_neighbours+=1;
            }
            else if(common_pts[0]&&(!common_pts[1])&&common_pts[2]){
                neighbours[1] = i;
                nb_neighbours+=1;
            }
            else if((!common_pts[0])&&common_pts[1]&&common_pts[2]){
                neighbours[0] = i;
                nb_neighbours+=1;
            }
            if(nb_neighbours==3){
                break;
            }
        }
        return neighbours;

    }






    /**
     * Retrouve les 2 vertex voisins du vertex actuel (voisins par triangles adjacents)
     * @param {*} vertex_id : position of the vertex in the triangle
     * @param {*} id_triangle : position of the triangle in the triangle_data object
     */
    findVertexNeighbour(vertex_pos, id_triangle){

        let result = [null, null];

        let neighbour_1, neighbour_2;
        let vertex_index = this.triangle_data.vIndex[3*id_triangle+vertex_pos];
        if(vertex_pos == 0){
            neighbour_1 = 1;
            neighbour_2 = 2;
        }
        if(vertex_pos == 1){
            neighbour_1 = 0;
            neighbour_2 = 2;
        }
        if(vertex_pos == 2){
            neighbour_1 = 0;
            neighbour_2 = 1;
        }

        let neighbour_id1 = this.triangle_data.tIndex[3*id_triangle+neighbour_1];
        let neighbour_id2 = this.triangle_data.tIndex[3*id_triangle+neighbour_2];

        let id_pt = this.vertex_data.pIndex[vertex_index];

        


        let n1_vert_1 = this.triangle_data.vIndex[3*neighbour_id1];
        let n1_vert_2 = this.triangle_data.vIndex[3*neighbour_id1+1];
        let n1_vert_3 = this.triangle_data.vIndex[3*neighbour_id1+2];

        let id_n1_vert_1 = this.vertex_data.pIndex[n1_vert_1];
        let id_n1_vert_2 = this.vertex_data.pIndex[n1_vert_2];
        let id_n1_vert_3 = this.vertex_data.pIndex[n1_vert_3];


        if(id_n1_vert_1==id_pt){
            result[0] = n1_vert_1;
        }
        else if(id_n1_vert_2==id_pt){
            result[0] = n1_vert_2;
        }
        else if(id_n1_vert_3==id_pt){
            result[0] = n1_vert_3;
        }

    
        let n2_vert_1 = this.triangle_data.vIndex[3*neighbour_id2];
        let n2_vert_2 = this.triangle_data.vIndex[3*neighbour_id2+1];
        let n2_vert_3 = this.triangle_data.vIndex[3*neighbour_id2+2];

        let id_n2_vert_1 = this.vertex_data.pIndex[n2_vert_1];
        let id_n2_vert_2 = this.vertex_data.pIndex[n2_vert_2];
        let id_n2_vert_3 = this.vertex_data.pIndex[n2_vert_3];

        if(id_n2_vert_1==id_pt){
            result[1] = n2_vert_1;
        }
        else if(id_n2_vert_2==id_pt){
            result[1] = n2_vert_2;
        }
        else if(id_n2_vert_3==id_pt){
            result[1] = n2_vert_3;
        }
        

        return(result);





        




    }

}

class ModelBuilder{
    constructor(){
        this.buildings = [];
    }

    build(buildingJsObject){
        let buildingParts = [];

        
        buildingJsObject.buildingParts.forEach(
            buildingPart=>{
                let bp_points = [];
                let bp_polygons = [];
                buildingPart.points.forEach(
                    p=>{
                        bp_points.push(new Point3D(p[0], p[1], p[2]));
                })

                //Creation of the polygons
                buildingPart.faces.forEach(
                    f=>{
                        let exteriorPointsList = [];
                        f[0].forEach(
                            p_index=>{
                                exteriorPointsList.push(bp_points[p_index]);
                            }
                        )
                        let exterior = new LinearRing(exteriorPointsList);

                        let interiorPointsList = [];
                        f[1].forEach(
                            p_index=>{
                                interiorPointsList.push(bp_points[p_index]);
                            }
                        )
                        let interior = new LinearRing(interiorPointsList);

                        bp_polygons.push(new Polygon(interior, exterior));
                })

                //Pour l'instant, on ne regroupe pas les faces en multi surfaces
                let bp_thematicSurfaces = [];
                bp_polygons.forEach(
                    polygon=>{
                        let multi_polygon = new MultiSurface([polygon]);
                        //Pour l'instant on ne s'occupe pas des LoD
                        bp_thematicSurfaces.push(new WallSurface(multi_polygon, multi_polygon, multi_polygon, multi_polygon));
                    }
                )
                buildingParts.push(new BuildingPart(bp_thematicSurfaces));
            })
            this.buildings.push(new Building(buildingParts));
    }
    getBuildings(){
        return this.buildings;
    }
}

export {ModelBuilder, SceneBuilder}