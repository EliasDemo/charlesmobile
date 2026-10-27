import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type JobPosting = S['JobPostingDto'];
export type JobPostingPage = S['JobPostingPageDto'];
export type JobApplication = S['JobApplicationDto'];
export type EmploymentType = JobPosting['employmentType'];
export type ApplicationStatus = JobApplication['status'];
export type Decision = S['DecideApplicationDto']['status'];
export type CreateJobBody = S['CreateJobPostingDto'];
export type UpdateJobBody = S['UpdateJobPostingDto'];
export type JobFilters = {
  style?: string;
  employmentType?: EmploymentType;
  /** District of the posting (INEI code). */
  ubigeo?: string;
  /** "Más cerca": nearest first (the backend answers up to 50, without pages). */
  near?: { latitude: number; longitude: number };
};

export const jobKeys = {
  all: ['jobs'] as const,
  list: (filters: JobFilters) => ['jobs', 'list', filters] as const,
  detail: (id: string) => ['jobs', 'detail', id] as const,
  mine: ['jobs', 'my-applications'] as const,
  shop: (shopId: string) => ['jobs', 'shop', shopId] as const,
  applicants: (shopId: string, jobId: string) => ['jobs', 'shop', shopId, 'applicants', jobId] as const,
};

const PAGE = 20;

/** Open postings (no session needed; with one, each brings `myApplicationStatus`). */
export const fetchJobs = (filters: JobFilters, cursor?: string): Promise<JobPostingPage> =>
  unwrap(
    api.GET('/api/v1/jobs', {
      params: {
        query: {
          limit: PAGE,
          ...(cursor ? { cursor } : {}),
          ...(filters.style ? { style: filters.style } : {}),
          ...(filters.employmentType ? { employmentType: filters.employmentType } : {}),
          ...(filters.ubigeo ? { ubigeo: filters.ubigeo } : {}),
          ...(filters.near
            ? { lat: filters.near.latitude, lng: filters.near.longitude, sort: 'distance' as const }
            : {}),
        },
      },
    }),
  );

export const fetchJob = (id: string): Promise<JobPosting> =>
  unwrap(api.GET('/api/v1/jobs/{id}', { params: { path: { id } } }));

/** Needs a professional profile (403 otherwise). */
export const applyToJob = (id: string, message?: string): Promise<JobApplication> =>
  unwrap(
    api.POST('/api/v1/jobs/{id}/applications', {
      params: { path: { id } },
      body: message?.trim() ? { message: message.trim() } : {},
    }),
  );

export const fetchMyApplications = (): Promise<JobApplication[]> =>
  unwrap(api.GET('/api/v1/me/job-applications'));

export const withdrawApplication = (id: string): Promise<JobApplication> =>
  unwrap(api.POST('/api/v1/me/job-applications/{id}/withdraw', { params: { path: { id } } }));

export const fetchShopJobs = (barbershopId: string): Promise<JobPosting[]> =>
  unwrap(api.GET('/api/v1/barbershops/{barbershopId}/jobs', { params: { path: { barbershopId } } }));

export const createJob = (barbershopId: string, body: CreateJobBody): Promise<JobPosting> =>
  unwrap(api.POST('/api/v1/barbershops/{barbershopId}/jobs', { params: { path: { barbershopId } }, body }));

export const updateJob = (barbershopId: string, id: string, body: UpdateJobBody): Promise<JobPosting> =>
  unwrap(
    api.PATCH('/api/v1/barbershops/{barbershopId}/jobs/{id}', {
      params: { path: { barbershopId, id } },
      body,
    }),
  );

export const fetchApplicants = (barbershopId: string, id: string): Promise<JobApplication[]> =>
  unwrap(
    api.GET('/api/v1/barbershops/{barbershopId}/jobs/{id}/applications', {
      params: { path: { barbershopId, id } },
    }),
  );

/** HIRED adds the barber to the team without services: assign services and hours next. */
export const decideApplication = (
  barbershopId: string,
  id: string,
  status: Decision,
): Promise<JobApplication> =>
  unwrap(
    api.POST('/api/v1/barbershops/{barbershopId}/job-applications/{id}/decision', {
      params: { path: { barbershopId, id } },
      body: { status },
    }),
  );

/** Creates the barber in the barbershop; they get the usual invitation code and a message. */
export const inviteBarberProfile = (barbershopId: string, barberProfileId: string, message?: string) =>
  unwrap(
    api.POST('/api/v1/barbershops/{barbershopId}/barber-invitations', {
      params: { path: { barbershopId } },
      body: { barberProfileId, ...(message?.trim() ? { message: message.trim() } : {}) },
    }),
  );
