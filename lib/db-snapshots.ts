import { prisma } from './db';
import { SnapshotInput } from './types';
export async function listSnapshots(): Promise<SnapshotInput[]> { const snaps=await prisma.sprintSnapshot.findMany({include:{items:true},orderBy:{reportDate:'desc'}}); return snaps.map((s:any)=>({id:s.id,name:s.name,sprintName:s.sprintName||'',reportDate:s.reportDate,sourceFileName:s.sourceFileName||'',items:s.items.map((i:any)=>({...i,dueDate:i.dueDate||undefined,rawJson:i.rawJson?JSON.parse(i.rawJson):undefined}))})); }
export async function getSnapshot(id:string){return (await listSnapshots()).find(s=>s.id===id);}
