import { Prisma } from '@prisma/client';

const userOrganizationWithUser =
  Prisma.validator<Prisma.UserOrganizationDefaultArgs>()({
    include: { user: true },
  });

export type UserOrganizationWithUser = Prisma.UserOrganizationGetPayload<
  typeof userOrganizationWithUser
>;

const userOrganizationWithUserAndOrganization =
  Prisma.validator<Prisma.UserOrganizationDefaultArgs>()({
    include: { user: true, organization: true },
  });

export type UserOrganizationWithUserAndOrganization =
  Prisma.UserOrganizationGetPayload<
    typeof userOrganizationWithUserAndOrganization
  >;

const manualWithAuthor = Prisma.validator<Prisma.ManualDefaultArgs>()({
  include: { author: true },
});

export type ManualWithAuthor = Prisma.ManualGetPayload<typeof manualWithAuthor>;

const manualWithSteps = Prisma.validator<Prisma.ManualDefaultArgs>()({
  include: { manualSteps: true },
});

export type ManualWithSteps = Prisma.ManualGetPayload<typeof manualWithSteps>;
