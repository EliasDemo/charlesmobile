import { api, fetchAllPages, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type MyBarbershop = S['MyBarbershopDto'];
export type ManagedShop = S['BarbershopManageDto'];
export type CreateShopBody = S['CreateBarbershopDto'];
export type CreatedShop = S['CreatedBarbershopDto'];
export type CreatedIndependent = S['CreatedIndependentDto'];
export type UpdateShopBody = S['UpdateBarbershopDto'];
export type StatusBody = S['UpdateBarbershopStatusDto'];
export type ManagedService = S['ServiceManageDto'];
export type ServiceBody = S['CreateServiceDto'];
export type UpdateServiceBody = S['UpdateServiceDto'];
export type ManagedBarber = S['BarberManageDto'];
export type CreateBarberBody = S['CreateBarberDto'];
export type UpdateBarberBody = S['UpdateBarberDto'];
export type Member = S['MemberDto'];
export type MemberRole = S['BarbershopMemberRole'];
export type Invitation = S['InvitationDto'];
export type BusinessHours = S['BusinessHoursDto'];
export type DaySchedule = S['DayScheduleDto'];
export type BarberSchedule = S['BarberScheduleDto'];
export type TimeBlock = S['TimeBlockDto'];
export type TimeBlockBody = S['CreateTimeBlockDto'];
export type TimeBlockType = S['TimeBlockType'];
export type MyBarberProfile = S['MyBarberProfileDto'];
export type Category = S['ServiceCategoryDto'];
export type OwnerDocumentBody = S['OwnerDocumentInputDto'];
export type ShopReview = S['BarbershopReviewDto'];
export type ShopStatus = S['BarbershopStatus'];

/** Largest page the API allows: management lists are short. */
const PAGE = 100;
const page = (cursor?: string) => ({ limit: PAGE, ...(cursor ? { cursor } : {}) });
const path = (id: string) => ({ path: { id } });

export const shopKeys = {
  all: ['shop-management'] as const,
  mine: ['shop-management', 'mine'] as const,
  detail: (id: string) => ['shop-management', id] as const,
  services: (id: string) => ['shop-management', id, 'services'] as const,
  barbers: (id: string) => ['shop-management', id, 'barbers'] as const,
  members: (id: string) => ['shop-management', id, 'members'] as const,
  hours: (id: string) => ['shop-management', id, 'hours'] as const,
  barberSchedule: (id: string, barberId: string) => ['shop-management', id, 'schedule', barberId] as const,
  blocks: (id: string) => ['shop-management', id, 'blocks'] as const,
  review: (id: string) => ['shop-management', id, 'review'] as const,
  myBarber: ['shop-management', 'me-barber'] as const,
  gallery: (id: string, barberId: string | null) =>
    ['shop-management', id, 'gallery', barberId ?? 'all'] as const,
  invitations: ['shop-management', 'invitations'] as const,
  categories: ['service-categories'] as const,
};

// Barbershops
export const fetchMyBarbershops = (): Promise<MyBarbershop[]> =>
  fetchAllPages((cursor) => unwrap(api.GET('/api/v1/me/barbershops', { params: { query: page(cursor) } })));
export const fetchManagedShop = (id: string): Promise<ManagedShop> =>
  unwrap(api.GET('/api/v1/me/barbershops/{id}', { params: path(id) }));
export const createBarbershop = (body: CreateShopBody): Promise<CreatedShop> =>
  unwrap(api.POST('/api/v1/barbershops', { body }));
export const createIndependent = (body: CreateShopBody): Promise<CreatedIndependent> =>
  unwrap(api.POST('/api/v1/barbershops/independent', { body }));
export const updateShop = (id: string, body: UpdateShopBody): Promise<ManagedShop> =>
  unwrap(api.PATCH('/api/v1/barbershops/{id}', { params: path(id), body }));
export const updateShopStatus = (id: string, body: StatusBody): Promise<ManagedShop> =>
  unwrap(api.PATCH('/api/v1/barbershops/{id}/status', { params: path(id), body }));
// Review before publishing (ALTA.md)
export const fetchReview = (id: string): Promise<ShopReview> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/review', { params: path(id) }));
export const submitReview = (id: string) =>
  unwrap(api.POST('/api/v1/barbershops/{id}/review/submit', { params: path(id) }));
export const saveOwnerDocument = (id: string, body: OwnerDocumentBody) =>
  unwrap(api.PUT('/api/v1/barbershops/{id}/owner-document', { params: path(id), body }));

export const fetchCategories = (): Promise<Category[]> =>
  unwrap(api.GET('/api/v1/service-categories')).then((list) => list.items);

// Services
export const fetchManagedServices = (id: string): Promise<ManagedService[]> =>
  fetchAllPages((cursor) =>
    unwrap(
      api.GET('/api/v1/me/barbershops/{id}/services', { params: { path: { id }, query: page(cursor) } }),
    ),
  );
export const createService = (id: string, body: ServiceBody): Promise<ManagedService> =>
  unwrap(api.POST('/api/v1/barbershops/{id}/services', { params: path(id), body }));
export const updateService = (
  id: string,
  serviceId: string,
  body: UpdateServiceBody,
): Promise<ManagedService> =>
  unwrap(
    api.PATCH('/api/v1/barbershops/{id}/services/{serviceId}', { params: { path: { id, serviceId } }, body }),
  );
export const deleteService = (id: string, serviceId: string) =>
  unwrap(
    api.DELETE('/api/v1/barbershops/{id}/services/{serviceId}', { params: { path: { id, serviceId } } }),
  );

// Barbers
export const fetchManagedBarbers = (id: string): Promise<ManagedBarber[]> =>
  fetchAllPages((cursor) =>
    unwrap(api.GET('/api/v1/me/barbershops/{id}/barbers', { params: { path: { id }, query: page(cursor) } })),
  );
export const createBarber = (id: string, body: CreateBarberBody): Promise<ManagedBarber> =>
  unwrap(api.POST('/api/v1/barbershops/{id}/barbers', { params: path(id), body }));
export const linkSelfAsBarber = (id: string, body: CreateBarberBody): Promise<ManagedBarber> =>
  unwrap(api.POST('/api/v1/barbershops/{id}/barbers/me', { params: path(id), body }));
export const updateBarber = (id: string, barberId: string, body: UpdateBarberBody): Promise<ManagedBarber> =>
  unwrap(
    api.PATCH('/api/v1/barbershops/{id}/barbers/{barberId}', { params: { path: { id, barberId } }, body }),
  );
/** Up to 5 styles the barber specializes in (GET /service-styles). */
export const setBarberSpecialties = (id: string, barberId: string, styleIds: string[]) =>
  unwrap(
    api.PUT('/api/v1/barbershops/{id}/barbers/{barberId}/specialties', {
      params: { path: { id, barberId } },
      body: { styleIds },
    }),
  );

export const setBarberServices = (
  id: string,
  barberId: string,
  serviceIds: string[],
): Promise<ManagedBarber> =>
  unwrap(
    api.PUT('/api/v1/barbershops/{id}/barbers/{barberId}/services', {
      params: { path: { id, barberId } },
      body: { serviceIds },
    }),
  );
export const inviteBarber = (id: string, barberId: string, email: string) =>
  unwrap(
    api.POST('/api/v1/barbershops/{id}/barbers/{barberId}/invitations', {
      params: { path: { id, barberId } },
      body: { email },
    }),
  );

// Members (owners and managers)
export const fetchMembers = (id: string): Promise<Member[]> =>
  fetchAllPages((cursor) =>
    unwrap(api.GET('/api/v1/barbershops/{id}/members', { params: { path: { id }, query: page(cursor) } })),
  );
export const inviteMember = (id: string, email: string, role: MemberRole) =>
  unwrap(
    api.POST('/api/v1/barbershops/{id}/members/invitations', { params: path(id), body: { email, role } }),
  );
export const changeMemberRole = (id: string, userId: string, role: MemberRole) =>
  unwrap(
    api.PATCH('/api/v1/barbershops/{id}/members/{userId}', {
      params: { path: { id, userId } },
      body: { role },
    }),
  );
export const removeMember = (id: string, userId: string) =>
  unwrap(api.DELETE('/api/v1/barbershops/{id}/members/{userId}', { params: { path: { id, userId } } }));

// Hours
export const fetchBusinessHours = (id: string): Promise<BusinessHours> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/business-hours', { params: path(id) }));
export const saveBusinessHours = (id: string, days: DaySchedule[]) =>
  unwrap(api.PUT('/api/v1/barbershops/{id}/business-hours', { params: path(id), body: { days } }));
export const fetchBarberSchedule = (id: string, barberId: string): Promise<BarberSchedule> =>
  unwrap(
    api.GET('/api/v1/barbershops/{id}/barbers/{barberId}/schedule', { params: { path: { id, barberId } } }),
  );
/** Empty `days` = the barber uses the barbershop's hours. */
export const saveBarberSchedule = (id: string, barberId: string, days: DaySchedule[]) =>
  unwrap(
    api.PUT('/api/v1/barbershops/{id}/barbers/{barberId}/schedule', {
      params: { path: { id, barberId } },
      body: { days },
    }),
  );

// Time blocks
export const fetchTimeBlocks = (id: string): Promise<TimeBlock[]> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/time-blocks', { params: path(id) }));
export const createTimeBlock = (id: string, body: TimeBlockBody): Promise<TimeBlock> =>
  unwrap(api.POST('/api/v1/barbershops/{id}/time-blocks', { params: path(id), body }));
export const deleteTimeBlock = (id: string, blockId: string) =>
  unwrap(api.DELETE('/api/v1/barbershops/{id}/time-blocks/{blockId}', { params: { path: { id, blockId } } }));

// The barber's own side
export const fetchMyBarberProfiles = (): Promise<MyBarberProfile[]> =>
  unwrap(api.GET('/api/v1/me/barber')).then((result) => result.items);
export const fetchInvitations = (): Promise<Invitation[]> =>
  fetchAllPages((cursor) =>
    unwrap(api.GET('/api/v1/me/barbershop-invitations', { params: { query: page(cursor) } })),
  );
export const acceptInvitation = (invitationId: string, code: string) =>
  unwrap(
    api.POST('/api/v1/me/barbershop-invitations/{invitationId}/accept', {
      params: { path: { invitationId } },
      body: { code },
    }),
  );

// Photos (backend phase 14): multipart with the image in `file` (docs/api/IMAGENES.md).
export type ManagedGalleryImage = S['GalleryImageManageDto'];
export type ManagedGalleryPage = S['GalleryManagePageDto'];
export type GalleryUpdateBody = S['UpdateGalleryImageDto'];
const multipart = { bodySerializer: (body: unknown) => body as FormData };

export const uploadCover = (id: string, form: FormData) =>
  unwrap(api.PUT('/api/v1/barbershops/{id}/cover', { params: path(id), body: form as never, ...multipart }));
export const deleteCover = (id: string) =>
  unwrap(api.DELETE('/api/v1/barbershops/{id}/cover', { params: path(id) }));
export const uploadLogo = (id: string, form: FormData) =>
  unwrap(api.PUT('/api/v1/barbershops/{id}/logo', { params: path(id), body: form as never, ...multipart }));
export const deleteLogo = (id: string) =>
  unwrap(api.DELETE('/api/v1/barbershops/{id}/logo', { params: path(id) }));
export const uploadBarberPhoto = (id: string, barberId: string, form: FormData) =>
  unwrap(
    api.PUT('/api/v1/barbershops/{id}/barbers/{barberId}/photo', {
      params: { path: { id, barberId } },
      body: form as never,
      ...multipart,
    }),
  );
export const deleteBarberPhoto = (id: string, barberId: string) =>
  unwrap(
    api.DELETE('/api/v1/barbershops/{id}/barbers/{barberId}/photo', { params: { path: { id, barberId } } }),
  );

/** Gallery for management: also hidden ones, with openReports / hidden / removed. */
export const fetchManagedGallery = (
  id: string,
  barberId: string | null,
  cursor?: string,
): Promise<ManagedGalleryPage> =>
  unwrap(
    api.GET('/api/v1/me/barbershops/{id}/gallery', {
      params: {
        path: { id },
        query: { limit: PAGE, ...(barberId ? { barberId } : {}), ...(cursor ? { cursor } : {}) },
      },
    }),
  );
export const uploadGalleryImage = (id: string, barberId: string, form: FormData) =>
  unwrap(
    api.POST('/api/v1/barbershops/{id}/barbers/{barberId}/gallery', {
      params: { path: { id, barberId } },
      body: form as never,
      ...multipart,
    }),
  );
export const updateGalleryImage = (id: string, imageId: string, body: GalleryUpdateBody) =>
  unwrap(
    api.PATCH('/api/v1/barbershops/{id}/gallery/{imageId}', { params: { path: { id, imageId } }, body }),
  );
export const deleteGalleryImage = (id: string, imageId: string) =>
  unwrap(api.DELETE('/api/v1/barbershops/{id}/gallery/{imageId}', { params: { path: { id, imageId } } }));
