import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Clock, MapPin, Calendar, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const ScheduleSession = () => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const onSubmit = async (data: any) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('sessions').insert([{
        name: data.name,
        date: data.date,
        room: data.room,
        startTime: data.startTime,
        timeLimit: parseInt(data.timeLimit, 10),
        description: data.description || null,
        user_id: user.id,
        status: 'upcoming'
      }]);

      if (error) throw error;

      toast.success('Session scheduled successfully');
      reset();
    } catch (error: any) {
      console.error('Session insert error:', error);
      toast.error(error?.message || 'Failed to schedule session');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Schedule Session</h1>
        <p className="text-sm text-slate-500 mt-1">Create a new proctoring session for an upcoming exam.</p>
      </div>

      <div className="bg-white rounded-[16px] border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        <form className="p-6 sm:p-8" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="col-span-full">
              <label className="block text-sm font-semibold leading-6 text-slate-700">Session Name / ID</label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  {...register("name", { required: true })}
                  className="block w-full rounded-lg border border-slate-200 py-2.5 pl-10 text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 sm:text-sm sm:leading-6 transition-colors"
                  placeholder="e.g. Midterm CS101"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-semibold leading-6 text-slate-700">Date</label>
              <div className="mt-1.5 relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  type="date"
                  {...register("date", { required: true })}
                  className="block w-full rounded-lg border border-slate-200 py-2.5 pl-10 text-slate-800 shadow-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 sm:text-sm sm:leading-6 transition-colors"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-semibold leading-6 text-slate-700">Room / Location</label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  {...register("room", { required: true })}
                  className="block w-full rounded-lg border border-slate-200 py-2.5 pl-10 text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 sm:text-sm sm:leading-6 transition-colors"
                  placeholder="e.g. Lab 4B"
                />
              </div>
            </div>
            
            <div className="sm:col-span-3">
              <label className="block text-sm font-semibold leading-6 text-slate-700">Start Time</label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  type="time"
                  {...register("startTime", { required: true })}
                  className="block w-full rounded-lg border border-slate-200 py-2.5 pl-10 text-slate-800 shadow-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 sm:text-sm sm:leading-6 transition-colors"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-semibold leading-6 text-slate-700">Time Limit (mins)</label>
              <div className="mt-1.5">
                <input
                  type="number"
                  {...register("timeLimit", { required: true, min: 1 })}
                  className="block w-full rounded-lg border border-slate-200 py-2.5 pl-3 pr-3 text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 sm:text-sm sm:leading-6 transition-colors"
                  placeholder="120"
                />
              </div>
            </div>

            <div className="col-span-full">
              <label className="block text-sm font-semibold leading-6 text-slate-700">Session Description (Optional)</label>
              <div className="mt-1.5">
                <textarea
                  {...register("description")}
                  rows={3}
                  className="block w-full rounded-lg border border-slate-200 py-2.5 px-3 text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 sm:text-sm sm:leading-6 transition-colors resize-y"
                  placeholder="Provide any additional context or instructions for this session..."
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-x-6 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={() => reset()}
              className="text-sm font-semibold leading-6 text-slate-500 hover:text-slate-800 transition-colors"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-70 transition-colors"
            >
              {isLoading && <LoadingSpinner className="w-4 h-4" />}
              Schedule Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
