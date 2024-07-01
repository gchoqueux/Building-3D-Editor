import { Point3D, Polygon, LinearRing, MultiSurface } from "../CityGMLGeometricModel";
import { VertexData, TriangleData } from "../graphicalModels";
import { PointData, FaceData, HalfEdgeData, EdgeData } from "../GeometricalProxy";
import { Building, BuildingPart, ClosureSurface, WallSurface, FloorSurface, OuterFloorSurface, GroundSurface, RoofSurface } from "../CityGMLLogicalModel";
import { Controller, DualController } from "../controllers/controller";
import * as Utils from '../utils/utils';
import matrix from 'matrix-js';
import Earcut from "earcut";
import * as GeomUtils from '../utils/3DGeometricComputes';
import { embeddings } from "../GeometricalEmbedding";


class ModelBuilder{
    constructor(){
        this.buildings = [];
    }

    build(Object){
        console.error("Strategy not choosen : this is an abstract method");
    }
    getBuildings(){
        return this.buildings;
    }
}

class MockModelBuilder extends ModelBuilder{
    constructor(){
        super();
    }

    build(buildingJsObject){
        let buildingParts = [];

        
        buildingJsObject.buildingParts.forEach(
            buildingPart=>{
                let minPointId = Point3D.maxId;
                let minFaceId = Polygon.maxId;
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

                        let interiors = [];
                        f[1].forEach(interior=>{
                            let interiorPoints = [];
                            interior.forEach(p_index=>{
                                interiorPoints.push(bp_points[p_index]);
                            })
                            interiors.push(new LinearRing(interiorPoints));
                        })

                        bp_polygons.push(new Polygon(interiors, exterior));
                })

                //On corrige l'orientation des normales si besoin
                /*bp_polygons.forEach(
                    //Pour chaque polygon, on vérifie combien d'autres polygon sa normale 
                    //va croiser
                    polygon=>{
                        let nb_crossed_polygons = 0;
                        bp_polygons.forEach(polygon2=>{
                            if(polygon2.id != polygon.id){
                                let pt = polygon.exterior.positions[0];
                                let t = polygon2.intersectRay([pt.x, pt.y, pt.z], polygon.planeEquation.slice(0,3));
                                if(!isNaN(t) && t>0){
                                    nb_crossed_polygons+=1;
                                }
                            }
                            
                        });
                        if(nb_crossed_polygons%2==1){
                            console.log("invert "+polygon);
                            polygon.invertPlaneEquation();
                        }
                    }
                );*/

                //Pour l'instant, on ne regroupe pas les faces en multi surfaces
                let bp_thematicSurfaces = [];
                bp_polygons.forEach(
                    polygon=>{
                        let multi_polygon = new MultiSurface([polygon]);
                        //Pour l'instant on ne s'occupe pas des LoD
                        bp_thematicSurfaces.push(new WallSurface(multi_polygon, multi_polygon, multi_polygon, multi_polygon));
                    }
                )
                let maxPointId = Point3D.maxId-1;
                let maxFaceId = Polygon.maxId-1;
                buildingParts.push(new BuildingPart(bp_thematicSurfaces, minPointId, maxPointId, minFaceId, maxFaceId));
            })
            this.buildings.push(new Building(buildingParts));
    }
}



class CityJSONModelBuilder extends ModelBuilder{
    constructor(){
        super();
    }

    build(cityJSONObject){
        console.log(cityJSONObject)
        let buildingParts = [];

        let cityObjectsValues = Object.values(cityJSONObject.CityObjects);
        let i=0;
        cityObjectsValues.forEach(cityObject=>{
            //TODO : make a building with an aggregation of building parts
            //console.log(cityObject);
            //TODO : Do something with the attributes
            
            //i limit the number of buildings
            i++;
            if(i<=100){
                cityObject.geometry.forEach(geom=>{
                    let minPointId = Point3D.maxId;
                    let minFaceId = Polygon.maxId;
                    let bp_points = [];
                    let bp_points_indices = [];
                    let bp_polygons = [];
                    //TO DO : add the LOD
                    geom.boundaries[0].forEach(boundarie=>{
                        let exteriorPointsList = [];
                        boundarie[0].forEach(
                            p_index=>{
                                let index_in_BP_points = bp_points_indices.indexOf(p_index);
                                if(index_in_BP_points!=-1){
                                    exteriorPointsList.push(bp_points[index_in_BP_points]);
                                }
                                else{
                                    bp_points_indices.push(p_index);
                                    let [x,y,z] = cityJSONObject.vertices[p_index];
                                    let new_point3D = new Point3D(x,y,z);
                                    bp_points.push(new_point3D);
                                    exteriorPointsList.push(new_point3D);
                                }
                                
                            }
                        )
                        let exterior = new LinearRing(exteriorPointsList);

                        //TODO : Interiors ?
                        let interiors = [];
                        boundarie.slice(1, boundarie.length).forEach(ring=>{
                            let interiorPointsList = [];
                            ring.forEach(p_index=>{
                                let index_in_BP_points = bp_points_indices.indexOf(p_index);
                                if(index_in_BP_points!=-1){
                                    interiorPointsList.push(bp_points[index_in_BP_points]);
                                }
                                else{
                                    bp_points_indices.push(p_index);
                                    let [x,y,z] = cityJSONObject.vertices[p_index];
                                    let new_point3D = new Point3D(x,y,z);
                                    bp_points.push(new_point3D);
                                    interiorPointsList.push(new_point3D);
                                }
                            })
                            interiors.push(new LinearRing(interiorPointsList));
                        })


                        bp_polygons.push(new Polygon(interiors, exterior));
                    })
                    let bp_thematicSurfaces = [];
                    bp_polygons.forEach(
                        polygon=>{
                            let multi_polygon = new MultiSurface([polygon]);
                            //Pour l'instant on ne s'occupe pas des LoD
                            bp_thematicSurfaces.push(new WallSurface(multi_polygon, multi_polygon, multi_polygon, multi_polygon));
                        }
                    )
                    let maxPointId = Point3D.maxId-1;
                    let maxFaceId = Polygon.maxId-1;
                    buildingParts.push(new BuildingPart(bp_thematicSurfaces, minPointId, maxPointId, minFaceId, maxFaceId));
                    })
                }

            })
        this.buildings.push(new Building(buildingParts));
        console.log("result ====> ",this.buildings);
    }
}

export{ModelBuilder, MockModelBuilder, CityJSONModelBuilder}