UPDATE "Manga" SET "uploaderId" = (
  SELECT id FROM "User" WHERE email = 'scan@gruposcan.com'
);