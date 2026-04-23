-- Corrigir respostas de Pré-Festa sem event_id (match por nome)

-- 1. Giovana (22/04) → Cecília 05 anos (29/04)
UPDATE prefesta_responses SET event_id = 'bb082817-c0e6-40a2-b54d-b6029e8d83ab' WHERE id = '39ffcea1-38bd-460c-a9d7-9b077a4991a3' AND event_id IS NULL;

-- 2. KARINA (22/04) → Noah 04 anos (25/04)
UPDATE prefesta_responses SET event_id = '1d126b09-5f1d-4a87-8740-ef4e676a9d22' WHERE id = 'f51d10be-1ced-4bdf-a0c8-2f065311e912' AND event_id IS NULL;

-- 3. Pamela (22/04) → Antonella 2 anos (26/04)
UPDATE prefesta_responses SET event_id = '4efb09e6-cef4-481d-ae89-d16fc18b913e' WHERE id = '20eb0d0b-3bee-4ba6-bf9c-34bc00ab1285' AND event_id IS NULL;

-- 4. Yasmin (22/04) → Lívia 1 ano (25/04)
UPDATE prefesta_responses SET event_id = '628b8e77-9f93-45bd-a821-572b62ad1eac' WHERE id = 'bfa33d0b-c850-4d2f-9ea3-75bc28fa7d90' AND event_id IS NULL;

-- 5. Paloma (22/04) → Julia 1 ano (24/04)
UPDATE prefesta_responses SET event_id = '53bd8ab1-813b-427d-8cde-cf33c0261639' WHERE id = 'ccf911ff-d786-4378-82d5-3fdb51f22dcd' AND event_id IS NULL;

-- 7. Lívia Maria (16/04) → Livia 9 anos (19/04)
UPDATE prefesta_responses SET event_id = '76e90e69-d022-4869-ad2b-62c9bb22f9a9' WHERE id = 'd8729254-4c7c-47b6-92ad-f6fd938efc17' AND event_id IS NULL;

-- 8. Alline (15/04) → Helena 4 anos (19/04)
UPDATE prefesta_responses SET event_id = '033e7e5b-aa42-425b-a497-3938c668932c' WHERE id = '6c627b90-6768-4b21-a0f4-cd8a9ee853ed' AND event_id IS NULL;

-- 9. Manuella (15/04) → Manuella 1 ano (18/04)
UPDATE prefesta_responses SET event_id = '29604609-70a9-4133-97c2-865b2fbccd5b' WHERE id = 'da0afbd5-7d81-4332-861d-52e4f3c44571' AND event_id IS NULL;

-- 10. Olivia (14/04) → Olivia 1 ano (18/04)
UPDATE prefesta_responses SET event_id = '1fd58358-3da4-4bee-adfe-f5277c617053' WHERE id = 'c8a8adbb-b01b-4bea-96e5-a12949c4aaa0' AND event_id IS NULL;

-- 13. Victor (09/04) → Vitor 7 anos (11/04)
UPDATE prefesta_responses SET event_id = 'df832109-4b86-460d-b1f4-1c88e13608fc' WHERE id = '69fb88d6-bf47-4a00-9699-7f998e599e4a' AND event_id IS NULL;