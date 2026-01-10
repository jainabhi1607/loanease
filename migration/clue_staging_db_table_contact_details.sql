
-- --------------------------------------------------------

--
-- Table structure for table `contact_details`
--

CREATE TABLE `contact_details` (
  `id` int(11) NOT NULL,
  `first_name` varchar(150) DEFAULT NULL,
  `last_name` varchar(150) DEFAULT NULL,
  `email` varchar(200) DEFAULT NULL,
  `phone` varchar(100) DEFAULT NULL,
  `date_time` datetime DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `contact_details`
--

INSERT INTO `contact_details` (`id`, `first_name`, `last_name`, `email`, `phone`, `date_time`, `ip_address`) VALUES
(1, 'Abhishek', 'Jain', 'shankey@northbase.io', '9468590655', '2025-08-11 20:03:50', '103.87.58.133'),
(2, 'Gunjit', 'Singh', 'gunjit@northbase.app', '123456', '2025-08-11 20:24:51', '180.214.141.28'),
(3, 'Jack', 'Daniels', 'jack@northbase.app', '3232', '2025-08-13 14:20:07', '223.181.20.34'),
(4, 'Stuart', 'Cox', 'sc@stuartcox.com.au', '0438560629', '2025-08-14 09:36:56', '101.115.180.252'),
(5, 'Mr', 'Bean', 'luay@cluefinance.com.au', '0414223370', '2025-08-14 09:46:22', '180.222.165.95'),
(6, 'Gunjit', 'Singh', 'gunjit123@northbase.app', '1234', '2025-08-14 13:34:49', '180.214.133.191'),
(7, 'Gunjit', 'Singh', 'gunjit122@northbase.app', '9855801271', '2025-08-14 19:18:21', '180.214.133.191'),
(8, 'Stuart', 'Cox', 'aug16@northbase.io', '0438560629', '2025-08-16 15:13:06', '101.115.180.252'),
(9, 'Luay', 'Khreish', 'chris@cluefinance.com.au', '0414223370', '2025-08-19 11:38:31', '180.222.165.95'),
(11, 'Gunjit', 'Singh', 'anshveer2404@gmail.com', '9855801271', '2025-12-02 16:19:53', '180.214.148.116');
