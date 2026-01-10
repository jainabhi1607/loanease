
-- --------------------------------------------------------

--
-- Table structure for table `client_details`
--

CREATE TABLE `client_details` (
  `id` int(11) NOT NULL,
  `client_id` int(11) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `street_address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` int(2) DEFAULT NULL,
  `postcode` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `client_details`
--

INSERT INTO `client_details` (`id`, `client_id`, `address`, `street_address`, `city`, `state`, `postcode`) VALUES
(1, NULL, '', '', '', NULL, ''),
(2, NULL, '', '', '', NULL, ''),
(3, NULL, '', '', '', NULL, ''),
(4, 4, '5 Donegal Drive, Yaroomba QLD, Australia', '', '', NULL, ''),
(5, 5, 'Mansfield Street, Montreal, QC, Canada', '', '', NULL, ''),
(6, 6, '134 Cambridge Street, Collingwood VIC, Australia', '', '', NULL, ''),
(7, 7, '', '', '', NULL, ''),
(8, 8, 'Mansiche, Trujillo, Peru', '236', 'JP', 2, '302018'),
(9, 9, '', '', '', NULL, ''),
(10, 10, '540 Queen Street, Brisbane City QLD, Australia', '', '', NULL, ''),
(11, 11, '134 Cambridge Street, Collingwood VIC, Australia', '', '', NULL, ''),
(12, 12, '1132 Murphy Ridge Rd, Strunk, KY, USA', '', '', NULL, ''),
(13, 13, '6571 Altura Boulevard, Buena Park, CA, USA', '', '', NULL, ''),
(14, 14, '22 Godam Circle, Hawa Sadak, C Scheme, Ashok Nagar, Jaipur, Rajasthan, India', '', '', NULL, ''),
(15, 1, '', '', '', NULL, ''),
(16, 15, 'New South Wales Crescent, Barton ACT, Australia', '', '', NULL, ''),
(17, 16, 'Mumbai - Pune Expressway, Yamuna Kunj, Sector-10, New Panvel East, Panvel, Navi Mumbai, Maharashtra, India', '', '', NULL, ''),
(18, 17, '5 Donegal Drive, Yaroomba QLD, Australia', '', '', NULL, ''),
(19, 18, '', '', '', NULL, ''),
(22, 21, '1 Allen Street, Pyrmont NSW, Australia', '', '', NULL, ''),
(23, 22, '64 Pym Street, Dudley Park SA, Australia', '', '', NULL, ''),
(24, 23, 'John Paul II Avenue 78, Warsaw, Poland', '', '', NULL, ''),
(25, 24, 'Chandni Chowk Flyover, Chandani Chowk, Kothrud, Pune, Maharashtra, India', '', '', NULL, ''),
(28, 27, 'Australia Avenue, Sydney Olympic Park NSW, Australia', '', '', NULL, ''),
(29, 28, '5 Donegal Drive, Yaroomba QLD, Australia', '', '', NULL, ''),
(30, 29, 'Siliguri Station Road, Ward 1, Patiram Jote, Siliguri, West Bengal, India', '', '', NULL, ''),
(31, 30, 'Garon Park, Southend-on-Sea, UK', '', '', NULL, ''),
(32, 31, '5 Donegal Drive, Yaroomba QLD, Australia', '', '', NULL, ''),
(33, 32, '5 Donegal Drive, Yaroomba QLD, Australia', '', '', NULL, ''),
(34, 33, '5 Donegal Drive, Yaroomba QLD, Australia', '', '', NULL, ''),
(35, 34, 'koyambedu bus terminus, SAF Games Village, Annai Sathya Nagar, Koyambedu, Chennai, Tamil Nadu, India', '', '', NULL, ''),
(36, 35, '1 Main Street, Box Hill VIC, Australia', '', '', NULL, ''),
(37, 36, '5 Donegal Avenue, Smithfield NSW, Australia', '', '', NULL, ''),
(38, 37, '12A Duke Court, Tallai QLD, Australia', '', '', NULL, ''),
(39, 38, '111 Eagle Street, Brisbane City QLD, Australia', '', '', NULL, ''),
(40, 39, '', '', '', NULL, ''),
(41, 40, '', '', '', NULL, ''),
(42, 41, '', '', '', NULL, ''),
(43, 42, '5 Donegal Drive, Yaroomba QLD, Australia', '', '', NULL, '');
