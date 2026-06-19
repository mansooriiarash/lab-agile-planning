import * as React from 'react'; import { cn } from '@/lib/utils';
export function Input(props:React.InputHTMLAttributes<HTMLInputElement>){return <input {...props} className={cn('w-full rounded-xl border px-3 py-2',props.className)}/>}
