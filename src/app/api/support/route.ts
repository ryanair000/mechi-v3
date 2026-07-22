import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createNotification } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';

const CATEGORIES = new Set(['account','tournament','payment','match_result','team','safety','other']);
function makeCaseReference() { return `PM-${new Date().getUTCFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`; }

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const supabase = createServiceClient(); const { data, error } = await supabase.from('support_threads').select('id,subject,issue_category,context_type,context_id,case_reference,resolution_summary,status,priority,last_message_at,created_at,updated_at').eq('channel','in_app').eq('user_id',access.profile.id).order('last_message_at',{ascending:false});
  if (error) return NextResponse.json({error:'Could not load your support cases.'},{status:500}); return NextResponse.json({cases:data??[]});
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null; const subject=String(body?.subject??'').trim().slice(0,120); const message=String(body?.message??'').trim().slice(0,5000); const category=CATEGORIES.has(String(body?.category))?String(body?.category):'other'; const contextType=String(body?.context_type??'general').trim().slice(0,40); const contextId=String(body?.context_id??'').trim().slice(0,120)||null; const key=String(body?.idempotency_key??crypto.randomUUID()).slice(0,100);
  if(subject.length<4)return NextResponse.json({error:'Add a clear subject.'},{status:400}); if(message.length<10)return NextResponse.json({error:'Tell us what happened and what help you need.'},{status:400});
  const supabase=createServiceClient(); const externalId=`inapp:${access.profile.id}:${key}`; const {data:existing}=await supabase.from('support_threads').select('id,case_reference').eq('channel','in_app').eq('wa_id',externalId).maybeSingle(); if(existing)return NextResponse.json({case:existing});
  const now=new Date().toISOString(); const {data:thread,error}=await supabase.from('support_threads').insert({channel:'in_app',wa_id:externalId,contact_name:access.profile.username,user_id:access.profile.id,status:'waiting_on_human',priority:category==='safety'?'high':'normal',subject,issue_category:category,context_type:contextType,context_id:contextId,case_reference:makeCaseReference(),last_message_at:now,updated_at:now}).select('id,subject,issue_category,context_type,context_id,case_reference,status,priority,last_message_at,created_at').single();
  if(error||!thread)return NextResponse.json({error:'Could not create the support case.'},{status:500}); const {error:messageError}=await supabase.from('support_messages').insert({thread_id:thread.id,direction:'inbound',sender_type:'user',body:message,message_type:'text',meta:{source:'in_app',context_type:contextType,context_id:contextId}}); if(messageError){await supabase.from('support_threads').delete().eq('id',thread.id).eq('user_id',access.profile.id);return NextResponse.json({error:'Could not save the support message.'},{status:500});}
  await createNotification({user_id:access.profile.id,type:'support_case_created',title:`${thread.case_reference} created`,body:'Mechi Support will reply in this case.',href:`/support?case=${thread.id}`,metadata:{support_thread_id:thread.id}},supabase); return NextResponse.json({case:thread},{status:201});
}
