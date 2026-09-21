-- Four seed quick-reply templates. Bilingual. Editable later via a CRUD
-- or by re-running this after truncating the table.
INSERT INTO templates (label, body, language, sort_order)
SELECT * FROM (VALUES
  ('Book appointment (EN)',
   'I''d love to schedule an appointment with you. You can easily set it up here: skylarmodeling.com/contact',
   'en', 1),
  ('Reservar cita (ES)',
   'Me encantaría agendar una cita contigo. Puedes reservarla fácilmente aquí: skylarmodeling.com/contact',
   'es', 2),
  ('Follow up (EN)',
   'Just checking in! Are you still interested in learning more about Skylar Modeling?',
   'en', 3),
  ('Understood (EN)',
   'Understood — thanks for letting us know! If anything changes down the road, we''re just a text away.',
   'en', 4)
) AS seed(label, body, language, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM templates);
