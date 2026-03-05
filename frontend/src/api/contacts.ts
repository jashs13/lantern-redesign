import { apiClient } from './client';
import type { Contact, ContactQueryParams, PaginatedResponse } from './types';

export async function fetchContacts(
  params?: ContactQueryParams,
): Promise<PaginatedResponse<Contact>> {
  return apiClient<PaginatedResponse<Contact>>('/api/v1/contacts', {
    page: params?.page,
    page_size: params?.page_size,
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    has_contact: params?.has_contact,
    search: params?.search,
  });
}
