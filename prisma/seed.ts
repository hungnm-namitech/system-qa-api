import { fakerJA as faker } from '@faker-js/faker';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const numberOfOrganizations = new Array(5).fill(null);
  const numberOfUsers = new Array(5).fill(null);

  for (let i = 0; i < numberOfOrganizations.length; i++) {
    await prisma.organization.create({
      data: {
        name: faker.company.name(),
        users: {
          create: numberOfUsers.map(() => {
            return {
              user: {
                create: {
                  name: faker.person.fullName(),
                  email: faker.internet.exampleEmail(),
                  password: faker.internet.password(),
                },
              },
              role: UserRole.ADMIN,
            };
          }),
        },
      },
    });
  }

  for (let i = 0; i < numberOfUsers.length; i++) {
    await prisma.emailWhitelist.create({
      data: {
        email: faker.internet.exampleEmail(),
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
