import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { listSnapshots } from '@/lib/db-snapshots';
export async function GET(){return NextResponse.json(await listSnapshots());}
export async function POST(req:Request){
 const body=await req.json();
 const s=await prisma.sprintSnapshot.create({
  data:{name:body.name,sprintName:body.sprintName,reportDate:new Date(body.reportDate),sourceFileName:body.sourceFileName,items:{create:body.items.map((i:any)=>({...i,dueDate:i.dueDate?new Date(i.dueDate):undefined,rawJson:JSON.stringify(i.rawJson||{})}))}},
  include:{items:true}
 });
 return NextResponse.json(s);
}
