-- Seed quick-reply templates. Idempotent per label, so this file can be
-- re-run after adding new rows. Editing an existing body should be done in
-- the DB directly — this WHERE clause never overwrites.
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
   'en', 4),
  ('Wrong email / spam (EN)',
   'You might have signed up with the wrong email or check your spam folder — I''d love to schedule an appointment with you. You can easily set it up here: skylarmodeling.com/contact',
   'en', 5),
  ('Correo/spam (ES · virtual)',
   'Puede que te hayas registrado con el correo equivocado o revisa tu carpeta de spam — me encantaría agendar tu audición virtual. Puedes reservarla aquí: https://calendly.com/d/ctgt-9s5-7ws/virtual-audicion',
   'es', 6),
  ('Correo/spam (ES · presencial)',
   'Puede que te hayas registrado con el correo equivocado o revisa tu carpeta de spam — me encantaría agendar tu audición presencial. Puedes reservarla aquí: https://calendly.com/skylarmodeling/audicion',
   'es', 7),
  ('Cost? (EN)',
   E'The consultation is completely free! We only work with 6 models, and if we feel you''re a good fit, we may offer you a program that requires an investment. If not, we''ll still give you your next steps for free.\n\nI''d love to schedule an appointment with you! You can easily book one here: skylarmodeling.com/contact',
   'en', 8),
  ('¿Costo? (ES)',
   E'¡La consulta es completamente gratuita! Solo trabajamos con 6 modelos, y si sentimos que eres una buena opción, es posible que te ofrezcamos un programa que requiera una inversión. Si no, igual te daremos tus próximos pasos sin costo.\n\n¡Me encantaría agendar una cita contigo! Puedes reservarla fácilmente aquí: https://calendly.com/skylarmodeling/audicion',
   'es', 9)
) AS seed(label, body, language, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM templates t WHERE t.label = seed.label);
