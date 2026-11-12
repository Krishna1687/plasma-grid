export const warpStages = ['Intact','Fracture','Disintegration','Acceleration','Arrival'];
export const warpStage = (progress:number) => [.2,.4,.65,.85].filter(boundary => progress >= boundary).length;
