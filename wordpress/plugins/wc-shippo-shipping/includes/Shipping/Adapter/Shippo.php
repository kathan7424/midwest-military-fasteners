<?php

/*********************************************************************/
/*  PROGRAM          FlexRC                                          */
/*  PROPERTY         604-1097 View St                                 */
/*  OF               Victoria BC   V8V 0G9                          */
/*  				 Voice 604 800-7879                              */
/*                                                                   */
/*  Any usage / copying / extension or modification without          */
/*  prior authorization is prohibited                                */
/*********************************************************************/

namespace OneTeamSoftware\WooCommerce\Shipping\Adapter;

defined('ABSPATH') || exit;

if (!class_exists(__NAMESPACE__ . '\\Shippo')):

class Shippo extends AbstractAdapter
{
	protected $liveApiToken;
	protected $testApiToken;
	protected $labelFileType;

	// we don't want these properties overwritten by settings
	protected $_carriers;
	protected $_services;

	const MAX_DESCRIPTION_LENGTH = 45;

	public function __construct($id, array $settings = array())
	{
		$this->liveApiToken = null;
		$this->testApiToken = null;
		$this->labelFileType = 'PDF';

		parent::__construct($id, $settings);

		$this->currencies = array(
			'USD' => __('USD', $this->id),
			'CAD' => __('CAD', $this->id),
			'EUR' => __('EUR', $this->id),
		);

		$this->statuses = array(
			'PRE_TRANSIT' => __('Shipping Label Created', $this->id),
			'TRANSIT' => __('In Transit', $this->id),
			'DELIVERED' => __('Delivered', $this->id),
			'RETURNED' => __('Returned to Sender', $this->id),
			'FAILURE' => __('Exception', $this->id),
			'UNKNOWN' => __('Shipping Label Created', $this->id),
		);

		$this->completedStatuses = array(
			'DELIVERED',
			'RETURNED',
			'FAILURE',
		);

		$this->contentTypes = array(
			'MERCHANDISE' => __('Merchandise', $this->id),
			'DOCUMENTS' => __('Documents', $this->id),
			'GIFT' => __('Gift', $this->id),
			'RETURN_MERCHANDISE' => __('Returned Goods', $this->id),
			'HUMANITARIAN_DONATION' => __('Humanitarian Donation', $this->id),
			'OTHER' => __('Other', $this->id),
		);

		$this->initPackageTypes();
		$this->initCarriers();
		$this->initServices();
	}

	public function getName()
	{
		return 'Shippo';
	}

	public function hasCustomItemsFeature()
	{
		return true;
	}

	public function hasTariffFeature()
	{
		return true;
	}

	public function hasUseSellerAddressFeature()
	{
		return true;
	}

	public function hasReturnLabelFeature()
	{
		return true;
	}

	public function hasAddressValidationFeature()
	{
		return true;
	}

	public function hasOriginFeature()
	{
		return true;
	}

	public function hasInsuranceFeature()
	{
		return true;
	}

	public function hasSignatureFeature()
	{
		return true;
	}

	public function hasDisplayDeliveryTimeFeature()
	{
		return true;
	}

	public function hasUpdateShipmentsFeature()
	{
		return true;
	}

	public function hasCreateShipmentFeature()
	{
		return true;
	}

	public function hasCreateManifestsFeature()
	{
		return true;
	}

	public function hasCreateOrderFeature()
	{
		return true;
	}

	public function hasImportShipmentsFeature()
	{
		return true;
	}

	public function validate(array $settings)
	{
		$errors = array();

		$this->setSettings($settings);

		$apiTokenKey = 'liveApiToken';
		$apiTokenName = __('Live API Token', $this->id);
		if ($settings['sandbox'] == 'yes') {
			$apiTokenKey = 'testApiToken';
			$apiTokenName = __('Test API Token', $this->id);
		}

		if (empty($settings[$apiTokenKey])) {
			$errors[] = sprintf('<strong>%s:</strong> %s', $apiTokenName, __('is required for the integration to work', $this->id));
		} else if (!$this->validateActiveApiToken()) {
			$errors[] = sprintf('<strong>%s:</strong> %s', $apiTokenName, __('is invalid', $this->id));
		}

		return $errors;
	}

	protected function validateActiveApiToken()
	{
		$dateTime = new \DateTime('NOW');
		$dateTime->format('c');

		$response = $this->sendRequest('shipments', 'GET', array('object_created_gt' => $dateTime->format('c')));
		
		if (!empty($response['error']['message']) && strpos($response['error']['message'], 'Token does not exist') !== false) {
			return false;
		}

		return true;
	}

	public function getIntegrationFormFields()
	{
		$formFields = array(
			'shippo_terms' => array(
				'type' => 'title',
				'description' => sprintf(
					'<div class="notice notice-info inline"><p>%s<br/>%s</p></div>',
					__('Please note that new Shippo accounts require manual verification.', $this->id),
					__('If plugin has suddently stopped returning shipping rates then you will have to email to support@goshippo.com to re-activate your account.', $this->id)
				),
			),

			'liveApiToken' => array(
				'title' => __('Live API Token', $this->id),
				'type' => 'text',
				'description' => sprintf(__('You can find it in your Shippo account on %sSettings -> Integrations -> API%s page.', $this->id), '<a href="https://app.goshippo.com/settings/api/" target="_blank">', '</a>'),
			),
			'testApiToken' => array(
				'title' => __('Sandbox / Test API Token', $this->id),
				'type' => 'text',
				'description' => sprintf(__('You can find it in your Shippo account on %sSettings -> Integrations -> API%s page.', $this->id), '<a href="https://app.goshippo.com/settings/api/" target="_blank">', '</a>'),
			),
			'labelFileType' => array(
				'title' => __('Shipping Label Format', $this->id),
				'type' => 'select',
				'options' => array(
					'PNG' => 'PNG', 
					'PNG_2.3x7.5' => 'PNG_2.3x7.5', 
					'PDF' => 'PDF',
					'PDF_2.3x7.5' => 'PDF_2.3x7.5',
					'PDF_4x6' => 'PDF_4x6',
					'PDF_4x8' => 'PDF_4x8',
					'PDF_A4' => 'PDF_A4',
					'PDF_A6' => 'PDF_A6',
					'ZPLII' => 'ZPLII'
				),
				'default' => 'PDF'
			),
		);

		return $formFields;
	}

	public function getRates(array $params)
	{
		$this->logger->debug(__FILE__, __LINE__, 'getRates');

		$params['function'] = __FUNCTION__;
		$response = $this->sendRequest('shipments', 'POST', $params);

		$this->logger->debug(__FILE__, __LINE__, 'Response: ' . print_r($response, true));

		return $response;
	}

	public function getCacheKey(array $params)
	{
		if (isset($params['service'])) {
			unset($params['service']);
		}

		if (isset($params['rate_id'])) {
			unset($params['rate_id']);
		}

		$params['api'] = $this->getApiKey();

		return parent::getCacheKey($params);
	}

	protected function getRequestBody(&$headers, &$params)
	{
		$headers['Content-Type'] = 'application/json';

		return json_encode($params);
	}

	protected function getRatesParams(array $inParams)
	{
		$params = array();
		$params['async'] = false;
		$params['mode'] = $this->sandbox ? 'test' : 'production';
		$params['extra']['is_return'] = false;
		if (!empty($inParams['return'])) {
			$params['extra']['is_return'] = filter_var($inParams['return'], FILTER_VALIDATE_BOOLEAN);
		}

		if (!empty($inParams['order_id'])) {
			$params['extra']['reference_1'] = $inParams['order_id'];
			$params['metadata'] = sprintf('Order %s', $inParams['order_id']);
		}
		if (!empty($inParams['order_number'])) {
			$params['extra']['reference_2'] = $inParams['order_number'];
		}

		if ($this->isInsuranceRequested($inParams) && !empty($inParams['value'])) {
			$params['extra']['insurance'] = array(
				'amount' => $inParams['value'],
				'currency' => $this->getRequestedCurrency($inParams),
			);
		}

		if ($this->isSignatureRequested($inParams)) {
			$params['extra']['signature_confirmation'] = 'STANDARD';
		}
		
		$inParams['origin'] = $this->getRequestedOrigin($inParams);

		if (!empty($inParams['origin'])) {
			$this->logger->debug(__FILE__, __LINE__, 'From Address: ' . print_r($inParams['origin'], true));

			$params['address_from'] = $this->prepareAddress($inParams['origin']);
		}

		if (!empty($inParams['destination'])) {
			$this->logger->debug(__FILE__, __LINE__, 'To Address: ' . print_r($inParams['destination'], true));

			$params['address_to'] = $this->prepareAddress($inParams['destination']);
		}

		$params['parcels'] = $this->prepareParcelInfo($inParams);

		if (isset($inParams['origin']['country']) 
			&& isset($inParams['destination']['country'])
			&& $inParams['origin']['country'] != $inParams['destination']['country']) {
			$params['customs_declaration'] = $this->prepareCustomsInfo($inParams);
		}

		return $params;
	}

	protected function getRequestParams(array $inParams)
	{
		$this->logger->debug(__FILE__, __LINE__, 'getRequestParams: ' . print_r($inParams, true));

		$params = array();

		if (!empty($inParams['function']) && $inParams['function'] == 'getRates') {
			$params = $this->getRatesParams($inParams);
		}

		return $params;
	}

	protected function prepareParcelInfo(array $inParams)
	{
		$this->logger->debug(__FILE__, __LINE__, 'prepareParcelInfo');

		if (!empty($inParams['type']) && $inParams['type'] != 'parcel' && isset($this->packageTypes[$inParams['type']])) {
			$parcel['template'] = $inParams['type'];
		}

		$parcel['weight'] = 0;
		$parcel['length'] = 0;
		$parcel['width'] = 0;
		$parcel['height'] = 0;

		if (isset($inParams['weight'])) {
			$parcel['weight'] = round($inParams['weight'], 2);
		}

		if (isset($inParams['length'])) {
			$parcel['length'] = round($inParams['length'], 2);
		}

		if (isset($inParams['width'])) {
			$parcel['width'] = round($inParams['width'], 2);
		}

		if (isset($inParams['height'])) {
			$parcel['height'] = round($inParams['height'], 2);
		}

		$dimensionUnit = $this->dimensionUnit;
		if (isset($inParams['dimension_unit']) && in_array($inParams['dimension_unit'], array('m', 'cm', 'mm', 'in'))) {
			$dimensionUnit = $inParams['dimension_unit'];
		}

		$parcel['distance_unit'] = $dimensionUnit;

		$weightUnit = $this->weightUnit;
		if (isset($inParams['weight_unit']) && in_array($inParams['weight_unit'], array('g', 'kg', 'lbs', 'oz'))) {
			$weightUnit = $inParams['weight_unit'];
		}

		if ($weightUnit == 'lbs') {
			$weightUnit = 'lb';
		}

		$parcel['mass_unit'] = $weightUnit;

		return array($parcel);
	}

	protected function prepareCustomsInfo(array $inParams)
	{
		$this->logger->debug(__FILE__, __LINE__, 'prepareCustomsInfo');

		$customsInfo = array(
			'certify' => true,
			'non_delivery_option' => 'RETURN'
		);

		if (!empty($inParams['origin']['name'])) {
			$customsInfo['certify_signer'] = trim($inParams['origin']['name']);
		} else if (!empty($inParams['origin']['company'])) {
			$customsInfo['certify_signer'] = trim($inParams['origin']['company']);
		} else {
			$customsInfo['certify_signer'] = 'Shipper';
		}

		if (!empty($inParams['order_number'])) {
			$customsInfo['invoice'] = $inParams['order_number'];
		}

		$customsInfo['contents_type'] = 'MERCHANDISE';
		if (!empty($inParams['contents']) && !empty($this->contentTypes[$inParams['contents']])) {
			$customsInfo['contents_type'] = $inParams['contents'];
		}

		if (isset($inParams['description'])) {
			$customsInfo['contents_explanation'] = $inParams['description'];
		}

		$defaultOriginCountry = '';
		if (isset($inParams['origin']['country'])) {
			$defaultOriginCountry = strtoupper($inParams['origin']['country']);
		}

		if (!empty($inParams['items']) && is_array($inParams['items'])) {
			$customsInfo['items'] = $this->prepareCustomsItems($inParams['items'], $defaultOriginCountry);
		}

		$this->logger->debug(__FILE__, __LINE__, 'Customs Info: ' . print_r($customsInfo, true));

		return $customsInfo;
	}

	protected function prepareCustomsItems(array $itemsInParcel, $defaultOriginCountry)
	{
		$this->logger->debug(__FILE__, __LINE__, 'prepareCustomsItems');

		$customsItems = array();

		foreach ($itemsInParcel as $itemInParcel) {
			if (empty($itemInParcel['country'])) {
				$itemInParcel['country'] = $defaultOriginCountry;
			}

			$customsItem = $this->prepareCustomsItem($itemInParcel);
			if (!empty($customsItem)) {
				$customsItems[] = $customsItem;
			}
		}
		
		return $customsItems;
	}

	protected function prepareCustomsItem($itemInParcel)
	{
		if (empty($itemInParcel['name']) || 
			!isset($itemInParcel['weight']) || 
			empty($itemInParcel['quantity']) ||
			!isset($itemInParcel['value'])) {
			$this->logger->debug(__FILE__, __LINE__, 'Item is invalid, so skip it ' . print_r($itemInParcel, true));

			return false;
		}

		$this->logger->debug(__FILE__, __LINE__, 'Customs Item: ' . print_r($itemInParcel, true));

		$weight = $itemInParcel['weight'] * $itemInParcel['quantity'];
		$value = $itemInParcel['value'] * $itemInParcel['quantity'];

		$tariff = $this->defaultTariff;
		if (!empty($itemInParcel['tariff'])) {
			$tariff = $itemInParcel['tariff'];
		}

		$weightUnit = $this->weightUnit;
		if ($weightUnit == 'lbs') {
			$weightUnit = 'lb';
		}

		$description = preg_replace('/[^\w\d\s]/', '?', utf8_decode($itemInParcel['name']));

		$customsItem = array(
			'description' => substr($description, 0, min(self::MAX_DESCRIPTION_LENGTH, strlen($description))),
			'quantity' => $itemInParcel['quantity'],
			'value_amount' => round($value, 3),
			'value_currency' => $this->currency,
			'net_weight' => round($weight, 3),
			'mass_unit' => $weightUnit,
			'origin_country' => $itemInParcel['country'],
			'tariff_number' => $tariff
		);

		return $customsItem;
	}

	protected function prepareAddress($options)
	{
		$addr = array('validate' => $this->validateAddress);

		$addr['is_residential'] = true;

		if (!empty($options['name'])) {
			$addr['name'] = $options['name'];
		} else {
			$addr['name'] = 'Resident';
		}

		if (!empty($options['company'])) {
			$addr['company'] = $options['company'];
			$addr['is_residential'] = false;

			if (empty($options['name'])) {
				$addr['name'] = $options['company'];
			}
		}

		if (isset($options['email'])) {
			$addr['email'] = $options['email'];
		}

		if (isset($options['phone'])) {
			if (is_array($options['phone'])) {
				$options['phone'] = current($options['phone']);
			}
			
			$addr['phone'] = $options['phone'];
		}

		if (isset($options['email'])) {
			if (is_array($options['email'])) {
				$options['email'] = current($options['email']);
			}
			
			$addr['email'] = $options['email'];
		}

		if (isset($options['country'])) {
			$addr['country'] = strtoupper($options['country']);
		}

		if (isset($options['state'])) {
			$addr['state'] = $options['state'];
		}

		if (isset($options['postcode'])) {
			$addr['zip'] = $options['postcode'];
		}

		if (isset($options['city'])) {
			$addr['city'] = $options['city'];
		}

		if (!empty($options['address'])) {
			$addr['street1'] = $options['address'];
		}

		if (isset($options['address_2'])) {
			$addr['street2'] = $options['address_2'];
		}

		return $addr;
	}

	protected function getValidationErrors($addressField, $addressType)
	{
		if (empty($addressField['validation_results']) || !empty($addressField['validation_results']['is_valid'])) {
			$this->logger->debug(__FILE__, __LINE__, 'Address is valid');

			return array();
		}
		
		$this->logger->debug(__FILE__, __LINE__, 'Address is invalid: ' . print_r($addressField['validation_results'], true));

		$validationErrors = array();

		foreach ($addressField['validation_results']['messages'] as $error) {
			$errorMessage = $this->getErrorMessage($error);
			$validationErrors[$addressType][] = $errorMessage;
		}

		return $validationErrors;
	}

	protected function getErrorMessage($error)
	{
		if (isset($error['object_id']) || isset($error['results']) || isset($error['tracking_number'])) {
			return '';
		}

		if (isset($error['__all__'])) {
			$error = $error['__all__'];
		}
		
		if (is_string($error)) {
			return $error;
		}

		if (isset($error['text'])) {
			return $error['text'];
		}

		$message = '';
		if (is_array($error)) {
			foreach ($error as $key => $val) {
				if (!empty($message)) {
					$message .= "\n";
				}

				if (!is_numeric($key)) {
					$message .= $key . ' -> ';
				}

				$message .= $this->getErrorMessage($val);
			}	
		}

		return trim($message);
	}

	protected function getShipmentResponse($response, array $params)
	{
		$this->logger->debug(__FILE__, __LINE__, 'getShipmentResponse');

		if (empty($response['object_id'])) {
			$this->logger->debug(__FILE__, __LINE__, 'Shipment ID has not been found');

			return array();
		}

		if (!empty($response['address_from'])) {
			$validationErrors = $this->getValidationErrors($response['address_from'], 'origin');
			if (!empty($validationErrors)) {
				$response['address_from']['object_id'] = null;
			}
		}

		if (!empty($response['address_to'])) {
			if ($this->validateAddress && empty($response['address_to']['is_complete'])) {
				$validationErrors['destination'][] = __('Address appears to be incomplete', $this->id);
	
				$this->logger->debug(__FILE__, __LINE__, 'Address is incomplete');
			}
	
			$validationErrors = $this->getValidationErrors($response['address_to'], 'destination');
			if (!empty($validationErrors)) {
				$response['address_to']['object_id'] = null;
			}
		}

		$currency = $this->getRequestedCurrency($params);
		$this->logger->debug(__FILE__, __LINE__, 'Requested currency: ' . $currency);

		if (!empty($response['rates'])) {
			$rates = array();

			foreach ($response['rates'] as $rate) {
				$serviceId = $rate['servicelevel']['token'];
				$serviceName = $rate['servicelevel']['name'];

				if (!empty($this->_services[$serviceId])) {
					$serviceName = $this->_services[$serviceId];
				}

				$rate['id'] = $rate['object_id'];
				$rate['service'] = $serviceId;
				$rate['carrier'] = $rate['provider'];

				if (isset($rate['currency']) && $rate['currency'] == $currency) {
					$rate['cost'] = $rate['amount'];
				} else if (isset($rate['currency_local']) && $rate['currency_local'] == $currency) {
					$rate['cost'] = $rate['amount_local'];
				} else if (isset($rate['currency']) && isset($this->currencies[$rate['currency']])) {
					$rate['cost'] = $rate['amount'];
				} else if (isset($rate['currency_local']) && isset($this->currencies[$rate['currency_local']])) {
					$rate['cost'] = $rate['amount_local'];
				} else {
					$rate['cost'] = $rate['amount'];
				}

				$rate['postage_description'] = apply_filters($this->id . '_service_name', $serviceName, $serviceId);
				$rate['delivery_fee'] = 0;
				$rate['tracking_type_description'] = '';
				$rate['delivery_time_description'] = '';

				$days = 0;
				if (!empty($rate['days'])) {
					$days = $rate['days'];
				} else if (!empty($rate['estimated_days'])) {
					$days = $rate['estimated_days'];
				}

				$rate['delivery_days'] = $days;

				if (!empty($days)) {
					$rate['delivery_time_description'] = sprintf(__('Estimated delivery in %d days', $this->id), $days);
				} else if (!empty($rate['duration_terms'])) {
					$rate['delivery_time_description'] = $rate['duration_terms'];
				}

				$rates[$serviceId] = $rate;

				if (empty($params['carrier'])) {
					if (!empty($params['service']) && $params['service'] == $serviceId) {
						$shipment['carrier'] = $rate['carrier'];
					} else if (!empty($params['rate_id']) && $params['rate_id'] == $rate['id']) {
						$shipment['carrier'] = $rate['carrier'];
					}	
				}
			}
			
			$shipment['id'] = $this->getShipmentId($response, $params);
			$shipment['ship_date'] = date('c');
			$shipment['rates'] = $this->sortRates($rates);
		}

		$newResponse = array();
		if (!empty($shipment)) {
			$newResponse['shipment'] = $shipment;
		}

		if (!empty($validationErrors)) {
			$newResponse['validation_errors'] = $validationErrors;
		}

		return $newResponse;
	}

	protected function getRatesResponse($response, array $params)
	{
		$this->logger->debug(__FILE__, __LINE__, 'getRatesResponse');

		return $this->getShipmentResponse($response, $params);
	}

	protected function getResponse($response, array $params)
	{
		$this->logger->debug(__FILE__, __LINE__, 'getResponse');

		$function = 0;
		if (!empty($params['function'])) {
			$function = $params['function'];
		}

		$newResponse = array('response' => array($function => $response), 'params' => $params);

		if (!empty($response['messages'])) {
			$newResponse['error']['message'] = $this->getErrorMessage($response['messages']);
		} else if ((empty($response['status']) || $response['status'] != 'SUCCESS') && empty($response['tracking_status'])) {
			$errorMessage = $this->getErrorMessage($response);
			if (!empty($errorMessage)) {
				$newResponse['error']['message'] = $errorMessage;
			}
		}
		
		if ($function == 'getRates') {
			$newResponse = array_replace_recursive($newResponse, $this->getRatesResponse($response, $params));
		}

		return $newResponse;
	}

	protected function getShipmentId($response, array $params)
	{
		$this->logger->debug(__FILE__, __LINE__, 'getShipmentId');

		$shipmentId = '';

		// 1. shipment id
		if (!empty($params['shipment_id'])) {
			$shipmentId = $params['shipment_id'];
		} else if (!empty($response['shipment_id'])) {
			$shipmentId = $response['shipment_id'];
		} else if (!empty($response['object_id'])) {
			$shipmentId = $response['object_id'];
		}

		return $shipmentId;
	}

	protected function getRouteUrl($route)
	{
		$routeUrl = sprintf('https://api.goshippo.com/%s', $route);

		return $routeUrl;
	}

	protected function addHeadersAndParams(&$headers, &$params)
	{
		$headers['Authorization'] = 'ShippoToken ' . $this->getApiKey();
	}

	protected function getApiKey()
	{
		return $this->sandbox ? $this->testApiToken : $this->liveApiToken;
	}

	public function getServices()
	{
		return $this->_services;
	}

	protected function initPackageTypes()
	{
		$this->packageTypes = array(
			'parcel' => 'Parcel',

			'couriersplease_500g_satchel' => 'CouriersPlease 500g Satchel',
			'couriersplease_1kg_satchel' => 'CouriersPlease 1kg Satchel',
			'couriersplease_3kg_satchel' => 'CouriersPlease 3kg Satchel',
			'couriersplease_5kg_satchel' => 'CouriersPlease 5g Satchel',

			'DHLeC_Irregular' => 'DHL eCommerce Irregular',
			'DHLeC_SM_Flats' => 'DHL eCommerce Flats',
			
			'Fastway_Australia_Satchel_A2' => 'Fastway Australia Satchel A2',
			'Fastway_Australia_Satchel_A3' => 'Fastway Australia Satchel A3',
			'Fastway_Australia_Satchel_A4' => 'Fastway Australia Satchel A4',
			'Fastway_Australia_Satchel_A5' => 'Fastway Australia Satchel A5',

			'FedEx_Envelope' => 'FedEx Envelope',
			'FedEx_Padded_Pak' => 'FedEx Padded Pak',
			'FedEx_Pak_2' => 'FedEx Small Pak',
			'FedEx_Pak_1' => 'FedEx Large Pak',
			'FedEx_XL_Pak' => 'FedEx Extra Large Pak',
			'FedEx_Tube' => 'FedEx Tube',
			'FedEx_Box_10kg' => 'FedEx 10kg Box',
			'FedEx_Box_25kg' => 'FedEx 25kg Box',
			'FedEx_Box_Small_1' => 'FedEx Small Box (S1)',
			'FedEx_Box_Small_2' => 'FedEx Small Box (S2)',
			'FedEx_Box_Medium_1' => 'FedEx Medium Box (M1)',
			'FedEx_Box_Medium_2' => 'FedEx Medium Box (M2)',
			'FedEx_Box_Large_1' => 'FedEx Large Box (L1)',
			'FedEx_Box_Large_2' => 'FedEx Large Box (L2)',
			'FedEx_Box_Extra_Large_1' => 'FedEx Extra Large Box (X1)',
			'FedEx_Box_Extra_Large_2' => 'FedEx Extra Large Box (X2)',

			'UPS_Express_Envelope' => 'UPS Express Envelope',
			'UPS_Express_Legal_Envelope' => 'UPS Express Legal Envelope',
			'UPS_Express_Box' => 'UPS Express Box',
			'UPS_Express_Box_Small' => 'UPS Small Express Box',
			'UPS_Express_Box_Medium' => 'UPS Medium Express Box',
			'UPS_Express_Box_Large' => 'UPS Large Express Box',
			'UPS_Box_10kg' => 'UPS 10kg Box',
			'UPS_Box_25kg' => 'UPS 25kg Box',
			'UPS_Express_Tube' => 'UPS Express Tube',
			'UPS_Express_Pak' => 'UPS Express Pak',
			'UPS_Laboratory_Pak' => 'UPS Laboratory Pak',
			'UPS_Pad_Pak' => 'UPS Pad Pak',
			'UPS_Pallet' => 'UPS Pallet',
			'UPS_MI_BPM' =>	'UPS BPM (Mail Innovations - Domestic & International)',
			'UPS_MI_BPM_Flat' => 'UPS BPM Flat (Mail Innovations - Domestic & International)',
			'UPS_MI_BPM_Parcel' =>	'UPS BPM Parcel (Mail Innovations - Domestic & International)',
			'UPS_MI_First_Class' =>	'UPS First Class (Mail Innovations - Domestic only)',
			'UPS_MI_Flat' => 'UPS Flat (Mail Innovations - Domestic only)',
			'UPS_MI_Irregular' => 'UPS Irregular (Mail Innovations - Domestic only)',
			'UPS_MI_Machinable' => 'UPS Machinable (Mail Innovations - Domestic only)',
			'UPS_MI_MEDIA_MAIL' => 'UPS Media Mail (Mail Innovations - Domestic only)',
			'UPS_MI_Parcel_Post' => 'UPS Parcel Post (Mail Innovations - Domestic only)',
			'UPS_MI_Priority' => 'UPS Priority (Mail Innovations - Domestic only)',
			'UPS_MI_Standard_Flat' => 'UPS Standard Flat (Mail Innovations - Domestic only)',
			'UPS_MI_Flat' => 'UPS Flat (Mail Innovations - Domestic only)',

			'USPS_FlatRateCardboardEnvelope' => 'USPS Flat Rate Cardboard Envelope',
			'USPS_FlatRateEnvelope' => 'USPS Flat Rate Envelope',
			'USPS_FlatRateGiftCardEnvelope' => 'USPS Flat Rate Gift Card Envelope',
			'USPS_FlatRateLegalEnvelope' => 'USPS Flat Rate Legal Envelope',
			'USPS_FlatRatePaddedEnvelope' => 'USPS Flat Rate Padded Envelope',
			'USPS_FlatRateWindowEnvelope' => 'USPS Flat Rate Window Envelope',
			'USPS_IrregularParcel' => 'USPS Irregular Parcel',
			'USPS_LargeFlatRateBoardGameBox' => 'USPS Large Flat Rate Board Game Box',
			'USPS_LargeFlatRateBox' => 'USPS Large Flat Rate Box',
			'USPS_APOFlatRateBox' => 'USPS APO/FPO/DPO Large Flat Rate Box',
			'USPS_LargeVideoFlatRateBox' => 'USPS Flat Rate Large Video Box (Int\'l only)',
			'USPS_MediumFlatRateBox1' => 'USPS Medium Flat Rate Box 1',
			'USPS_MediumFlatRateBox2' => 'USPS Medium Flat Rate Box 2',
			'USPS_RegionalRateBoxA1' => 'USPS Regional Rate Box A1',
			'USPS_RegionalRateBoxA2' => 'USPS Regional Rate Box A2',
			'USPS_RegionalRateBoxB1' => 'USPS Regional Rate Box B1',
			'USPS_RegionalRateBoxB2' => 'USPS Regional Rate Box B2',
			'USPS_SmallFlatRateBox' => 'USPS Small Flat Rate Box',
			'USPS_SmallFlatRateEnvelope' => 'USPS Small Flat Rate Envelope',
			'USPS_SoftPack' => 'USPS Soft Pack Padded Envelope',
		);
	}

	protected function initCarriers()
	{
		$this->_carriers = array(
			'apc_postal' => 'APC Postal',
			'australia_post' => 'Australia Post (also used for Startrack)',
			'aramex' => 'Aramex',
			'asendia_us' => 'Asendia',
			'axlehire' => 'AxleHire',
			'borderguru' => 'BorderGuru',
			'boxberry' => 'Boxberry',
			'bring' => 'Bring (also used for Posten Norge)',
			'canada_post' => 'Canada Post',
			'cdl' => 'CDL',
			'correios_br' => 'Correios Brazil',
			'correos_espana' => 'Correos Espana',
			'collect_plus' => 'CollectPlus',
			'couriersplease' => 'CouriersPlease',
			'deutsche_post' => 'Deutsche Post',
			'dhl_benelux' => 'DHL Benelux',
			'dhl_germany' => 'DHL Germany',
			'dhl_ecommerce' => 'DHL eCommerce',
			'dhl_express' => 'DHL Express',
			'dpd_germany' => 'DPD Germany',
			'dpd_uk' => 'DPD UK',
			'estafeta' => 'Estafeta',
			'fastway_australia' => 'Fastway Australia',
			'fedex' => 'FedEx',
			'gls_de' => 'GLS Germany',
			'gls_fr' => 'GLS France',
			'globegistics' => 'Globegistics',
			'gophr' => 'Gophr',
			'gso' => 'GSO',
			'hermes_uk' => 'Hermes UK',
			'hongkong_post' => 'HongKong Post',
			'lasership' => 'Lasership',
			'lso' => 'LSO',
			'mondial_relay' => 'Mondial Relay',
			'new_zealand_post' => 'New Zealand Post (also used for Pace and CourierPost)',
			'newgistics' => 'Newgistics',
			'nippon_express' => 'Nippon Express',
			'ontrac' => 'OnTrac',
			'orangeds' => 'OrangeDS',
			'parcel' => 'Parcel',
			'posti' => 'Posti',
			'purolator' => 'Purolator',
			'rr_donnelley' => 'RR Donnelley',
			'russian_post' => 'Russian Post',
			'sendle' => 'Sendle',
			'skypostal' => 'SkyPostal',
			'stuart' => 'Stuart',
			'ups' => 'UPS',
			'usps' => 'USPS',
			'yodel' => 'Yodel',
		);
	}

	protected function initServices()
	{
		$this->_services = array(
			'usps_priority' => 'USPS Priority Mail',
			'usps_priority_express' => 'USPS Priority Mail Express',
			'usps_first' => 'USPS First Class Mail/Package',
			'usps_parcel_select' => 'USPS Parcel Select',
			'usps_media_mail' => 'USPS Media Mail, only for existing Shippo customers with grandfathered Media Mail option.',
			'usps_priority_mail_international' => 'USPS Priority Mail International',
			'usps_priority_mail_express_international' => 'USPS Priority Mail Express International',
			'usps_first_class_package_international_service' => 'USPS First Class Package International',
			'fedex_ground' => 'FedEx Ground®',
			'fedex_home_delivery' => 'FedEx Home Delivery®',
			'fedex_smart_post' => 'FedEx SmartPost®',
			'fedex_2_day' => 'FedEx 2Day®',
			'fedex_2_day_am' => 'FedEx 2Day® A.M.',
			'fedex_express_saver' => 'FedEx Express Saver®',
			'fedex_standard_overnight' => 'FedEx Standard Overnight®',
			'fedex_priority_overnight' => 'FedEx Priority Overnight®',
			'fedex_first_overnight' => 'FedEx First Overnight®',
			'fedex_freight_priority' => 'FedEx Freight® Priority',
			'fedex_next_day_freight' => 'FedEx Next Day Freight',
			'fedex_freight_economy' => 'FedEx Freight® Economy',
			'fedex_first_freight' => 'FedEx First Freight',
			'fedex_international_economy' => 'FedEx International Economy®',
			'fedex_international_priority' => 'FedEx International Priority®',
			'fedex_international_first' => 'FedEx International First®',
			'fedex_europe_first_international_priority' => 'FedEx Europe International First®',
			'fedex_international_priority_express' => 'FedEx International Priority Express',
			'international_economy_freight' => 'FedEx International Economy® Freight',
			'international_priority_freight' => 'FedEx International Priority® Freight',
			'ups_standard' => 'UPS Standard℠',
			'ups_ground' => 'UPS Ground',
			'ups_saver' => 'UPS Saver®',
			'ups_3_day_select' => 'UPS 3 Day Select®',
			'ups_second_day_air' => 'UPS 2nd Day Air®',
			'ups_second_day_air_am' => 'UPS 2nd Day Air® A.M.',
			'ups_next_day_air' => 'UPS Next Day Air®',
			'ups_next_day_air_saver' => 'UPS Next Day Air Saver®',
			'ups_next_day_air_early_am' => 'UPS Next Day Air® Early',
			'ups_mail_innovations_domestic' => 'UPS Mail Innovations (domestic)',
			'ups_surepost' => 'UPS Surepost',
			'ups_surepost_bound_printed_matter' => 'UPS SurePost® Bound Printed Matter',
			'ups_surepost_lightweight' => 'UPS Surepost Lightweight',
			'ups_surepost_media' => 'UPS SurePost® Media',
			'ups_express' => 'UPS Express®',
			'ups_express_1200' => 'UPS Express 12:00',
			'ups_express_plus' => 'UPS Express Plus®',
			'ups_expedited' => 'UPS Expedited®',
			'apc_postal_parcelconnect_expedited' => 'APC parcelConnect Expedited',
			'apc_postal_parcelconnect_priority' => 'APC parcelConnect Priority',
			'apc_postal_parcelconnect_priority_delcon' => 'APC parcelConnect Priority Delcon',
			'apc_postal_parcelconnect_priority_pqw' => 'APC parcelConnect Priority PQW',
			'apc_postal_parcelconnect_book_service' => 'APC parcelConnect Book Service',
			'apc_postal_parcelconnect_standard' => 'APC parcelConnect Standard',
			'apc_postal_parcelconnect_epmi' => 'APC parcelConnect ePMI',
			'apc_postal_parcelconnect_epacket' => 'APC parcelConnect ePacket',
			'apc_postal_parcelconnect_epmei' => 'APC parcelConnect ePMEI',
			'asendia_us_priority_tracked' => 'Asendia USA Priority Tracked',
			'asendia_us_international_express' => 'Asendia USA International Express',
			'asendia_us_international_priority_airmail' => 'Asendia USA International Priority Airmail',
			'asendia_us_international_surface_airlift' => 'Asendia USA International Surface Air Lift',
			'asendia_us_priority_mail_international' => 'Asendia USA Priority Mail International',
			'asendia_us_priority_mail_express_international' => 'Asendia USA Priority Mail Express International',
			'asendia_us_epacket' => 'Asendia USA International ePacket',
			'asendia_us_other' => 'Asendia USA Other Services (custom)',
			'australia_post_express_post' => 'Australia Express Post',
			'australia_post_parcel_post' => 'Australia Parcel Post',
			'australia_post_pack_and_track_international' => 'Australia Pack and Track International',
			'australia_post_international_airmail' => 'Australia International Airmail',
			'australia_post_express_post_international' => 'Australia Express Post International',
			'australia_post_express_courier_international' => 'Australia Express Courier International',
			'australia_post_international_express' => 'Australia International Express',
			'australia_post_international_standard' => 'Australia International Standard',
			'australia_post_international_economy' => 'Australia International Economy',
			'axlehire_next_day' => 'AxleHire Next Day',
			'canada_post_regular_parcel' => 'Canada Post Regular Parcel',
			'canada_post_expedited_parcel' => 'Canada Post Expedited Parcel',
			'canada_post_priority' => 'Canada Post Priority',
			'canada_post_xpresspost' => 'Canada Post Xpresspost',
			'canada_post_xpresspost_international' => 'Canada Post Xpresspost International',
			'canada_post_xpresspost_usa' => 'Canada Post Xpresspost USA',
			'canada_post_expedited_parcel_usa' => 'Canada Post Expedited Parcel USA',
			'canada_post_tracked_packet_usa' => 'Canada Post Tracked Packet USA',
			'canada_post_small_packet_usa_air' => 'Canada Post Small Packet USA Air',
			'canada_post_tracked_packet_international' => 'Canada Post Tracked Packet International',
			'canada_post_small_packet_international_air' => 'Canada Post Small Package International Air',
			'cdl_next_day' => 'CDL Next Day',
			'couriersplease_domestic_priority_auth_to_leave' => 'CouriersPlease Domestic Priority - Authority To Leave/POPPoints',
			'couriersplease_domestic_priority_sign_required' => 'CouriersPlease Domestic Priority - Signature Required',
			'couriersplease_gold_domestic_auth_to_leave' => 'CouriersPlease Gold Domestic - Authority To Leave/POPPoints',
			'couriersplease_gold_domestic_sign_required' => 'CouriersPlease Gold Domestic - Signature Required',
			'couriersplease_off_peak_auth_to_leave' => 'CouriersPlease Off Peak - Authority To Leave/POPPoints',
			'couriersplease_off_peak_sign_required' => 'CouriersPlease Off Peak - Signature Required',
			'couriersplease_parcel_auth_to_leave' => 'CouriersPlease Parcel - Authority To Leave',
			'couriersplease_parcel_sign_required' => 'CouriersPlease Parcel - Signature Required',
			'couriersplease_road_express' => 'CouriersPlease Road Express',
			'couriersplease_satchel_auth_to_leave' => 'Satchel - Authority To Leave',
			'couriersplease_satchel_sign_required' => 'Satchel - Signature Required',
			'purolator_ground' => 'Purolator Ground',
			'purolator_ground9_am' => 'Purolator Ground 9am',
			'purolator_ground1030_am' => 'Purolator Ground 10:30am',
			'purolator_ground_distribution' => 'Purolator Ground Distribution',
			'purolator_ground_evening' => 'Purolator Ground Evening',
			'purolator_ground_us' => 'Purolator Ground US',
			'purolator_express' => 'Purolator Express',
			'purolator_express9_am' => 'Purolator Express 9am',
			'purolator_express1030_am' => 'Purolator Express 10am',
			'purolator_express_evening' => 'Purolator Express Evening',
			'purolator_express_us' => 'Purolator Express US',
			'purolator_express_us9_am' => 'Purolator Express US 9am',
			'purolator_express_us1030_am' => 'Purolator Express US 10:30am',
			'purolator_express_us1200' => 'Purolator Express US 12pm',
			'purolator_express_international' => 'Purolator Express International',
			'purolator_express_international9_am' => 'Purolator Express International 9am',
			'purolator_express_international1030_am' => 'Purolator Express International 10:30am',
			'purolator_express_international1200' => 'Purolator Express International 12pm',
			'dhl_express_domestic_express_doc' => 'DHL Domestic Express Doc',
			'dhl_express_economy_select_doc' => 'DHL Economy Select Doc',
			'dhl_express_worldwide_nondoc' => 'DHL Express Worldwide Nondoc',
			'dhl_express_worldwide_doc' => 'DHL Express Worldwide Doc',
			'dhl_express_worldwide' => 'DHL Worldwide',
			'dhl_express_worldwide_eu_doc' => 'DHL Express Worldwide EU Doc',
			'dhl_express_break_bulk_express_doc' => 'DHL Break Bulk Express Doc',
			'dhl_express_express_9_00_nondoc' => 'DHL Express 9:00 NonDoc',
			'dhl_express_economy_select_nondoc' => 'DHL Economy Select NonDoc',
			'dhl_express_break_bulk_economy_doc' => 'DHL Break Bulk Economy Doc',
			'dhl_express_express_9_00_doc' => 'DHL Express 9:00 Doc',
			'dhl_express_express_10_30_doc' => 'DHL Express 10:30 Doc',
			'dhl_express_express_10_30_nondoc' => 'DHL Express 10:30 NonDoc',
			'dhl_express_express_12_00_doc' => 'DHL Express 12:00 Doc',
			'dhl_express_europack_nondoc' => 'DHL Europack NonDoc',
			'dhl_express_express_envelope_doc' => 'DHL Express Envelope Doc',
			'dhl_express_express_12_00_nondoc' => 'DHL Express 12:00 NonDoc',
			'dhl_express_express_12_doc' => 'DHL Domestic Express 12:00',
			'dhl_express_worldwide_b2c_doc' => 'DHL Express Worldwide (B2C) Doc',
			'dhl_express_worldwide_b2c_nondoc' => 'DHL Express Worldwide (B2C) NonDoc',
			'dhl_express_medical_express' => 'DHL Medical Express',
			'dhl_express_express_easy_nondoc' => 'DHL Express Easy NonDoc',
			'dhl_ecommerce_marketing_parcel_expedited' => 'DHL eCommerce Marketing Parcel Expedited',
			'dhl_ecommerce_globalmail_business_ips' => 'DHL eCommerce Parcel International Expedited',
			'dhl_ecommerce_parcel_international_direct' => 'DHL eCommerce GlobalMail Business Standard',
			'dhl_ecommerce_parcels_expedited_max' => 'DHL eCommerce Parcels Expedited Max',
			'dhl_ecommerce_bpm_ground' => 'DHL eCommerce Bounded Printed Matter Ground',
			'dhl_ecommerce_priority_expedited' => 'DHL eCommerce Priority Expedited',
			'dhl_ecommerce_globalmail_packet_ipa' => 'DHL eCommerce GlobalMail Packet Priority',
			'dhl_ecommerce_globalmail_packet_isal' => 'DHL eCommerce GlobalMail Packet Standard',
			'dhl_ecommerce_easy_return_plus' => 'DHL eCommerce Easy Return Plus',
			'dhl_ecommerce_marketing_parcel_ground' => 'DHL eCommerce Marketing Parcel Ground',
			'dhl_ecommerce_first_class_parcel_expedited' => 'DHL eCommerce First Class Parcel Expedited',
			'dhl_ecommerce_globalmail_business_priority' => 'DHL eCommerce Parcel International Standard',
			'dhl_ecommerce_parcels_expedited' => 'DHL eCommerce Parcels Expedited',
			'dhl_ecommerce_globalmail_business_isal' => 'DHL eCommerce Parcel International Direct',
			'dhl_ecommerce_parcel_plus_expedited_max' => 'DHL eCommerce Parcel Plus Expedited Max',
			'dhl_ecommerce_globalmail_packet_plus' => 'DHL eCommerce GlobalMail Packet IPA',
			'dhl_ecommerce_parcels_ground' => 'DHL eCommerce Parcels Ground',
			'dhl_ecommerce_expedited' => 'DHL eCommerce Expedited',
			'dhl_ecommerce_parcel_plus_ground' => 'DHL eCommerce Parcel Plus Ground',
			'dhl_ecommerce_parcel_international_standard' => 'DHL eCommerce GlobalMail Business ISAL',
			'dhl_ecommerce_bpm_expedited' => 'DHL eCommerce Bounded Printed Matter Expedited',
			'dhl_ecommerce_parcel_international_expedited' => 'DHL eCommerce GlobalMail Business IPA',
			'dhl_ecommerce_globalmail_packet_priority' => 'DHL eCommerce GlobalMail Packet ISAL',
			'dhl_ecommerce_easy_return_light' => 'DHL eCommerce Easy Return Light',
			'dhl_ecommerce_parcel_plus_expedited' => 'DHL eCommerce Parcel Plus Expedited',
			'dhl_ecommerce_globalmail_business_standard' => 'DHL eCommerce GlobalMail Packet Plus',
			'dhl_ecommerce_ground' => 'DHL eCommerce Ground',
			'dhl_ecommerce_globalmail_packet_standard' => 'DHL eCommerce GlobalMail Business Priority',
			'dhl_germany_europaket' => 'DHL Germany Europaket',
			'dhl_germany_paket' => 'DHL Germany Paket',
			'dhl_germany_paket_connect' => 'DHL Germany Paket Connect',
			'dhl_germany_paket_international' => 'DHL Germany Paket International',
			'dhl_germany_paket_priority' => 'DHL Germany Paket Priority',
			'dhl_germany_paket_sameday' => 'DHL Germany Paket Sameday',
			'deutsche_post_postkarte' => 'Deutsche Post Postkarte',
			'deutsche_post_standardbrief' => 'Deutsche Post Standardbrief',
			'deutsche_post_kompaktbrief' => 'Deutsche Post Kompaktbrief',
			'deutsche_post_grossbrief' => 'Deutsche Post Grossbrief',
			'deutsche_post_maxibrief' => 'Deutsche Post Maxibrief',
			'deutsche_post_maxibrief_plus' => 'Deutsche Post Maxibrief Plus',
			'deutsche_post_warenpost_international_xs' => 'Deutsche Post Warenpost International XS',
			'deutsche_post_warenpost_international_s' => 'Deutsche Post Warenpost International S',
			'deutsche_post_warenpost_international_m' => 'Deutsche Post Warenpost International M',
			'deutsche_post_warenpost_international_l' => 'Deutsche Post Warenpost International L',
			'fastway_australia_parcel' => 'Fastway Australia Parcel',
			'fastway_australia_satchel' => 'Fastway Australia Satchel',
			'fastway_australia_box_small' => 'Fastway Australia Box Small',
			'fastway_australia_box_medium' => 'Fastway Australia Box Medium',
			'fastway_australia_box_large' => 'Fastway Australia Box Large',
			'globegistics_priority_mail_express_international' => 'Globegistics Priority Mail Express International',
			'globegistics_priority_mail_international' => 'Globegistics Priority Mail International',
			'globegistics_priority_mail_express_international_pds' => 'Globegistics Priority Mail Express International PreSort Drop Ship',
			'globegistics_priority_mail_international_pds' => 'Globegistics Priority Mail International PreSort Drop Ship',
			'globegistics_epacket' => 'Globegistics ePacket',
			'globegistics_ecom_tracked_ddp' => 'Globegistics eCom Tracked DDP',
			'globegistics_ecom_packet_ddp' => 'Globegistics eCom Packet DDP',
			'globegistics_ecom_priority_mail_international_ddp' => 'Globegistics eCom Priority Mail International DDP',
			'globegistics_ecom_priority_mail_express_international_ddp' => 'Globegistics eCom Priority Mail Express International DDP',
			'globegistics_ecom_extra' => 'Globegistics eCom Extra',
			'globegistics_ecom_international_priority_airmail' => 'Globegistics eCom International Priority Airmail',
			'globegistics_ecom_international_surface_airlift' => 'Globegistics eCom International Surface Air Lift',
			'gls_deutschland_business_parcel' => 'GLS Germany Business Parcel',
			'gls_france_business_parcel' => 'GLS France Business Parcel',
			'lso_ground' => 'LSO Ground',
			'lso_economy_next_day' => 'LSO Economy Next Day',
			'lso_saturday_delivery' => 'LSO Saturday Delivery',
			'lso_2nd_day' => 'LSO 2nd Day',
			'lso_priority_next_day' => 'LSO Priority Next Day',
			'lso_early_overnight' => 'LSO Early Overnight',
			'mondial_relay_pointrelais' => 'Mondial Relay Point Relais',
			'parcelforce_express48' => 'Parcelforce Express 48',
			'parcelforce_express24' => 'Parcelforce Express 24',
			'parcelforce_expressam' => 'Parcelforce Express AM',
			'rr_donnelley_domestic_economy_parcel' => 'RR Donnelley Domestic Economy Parcel',
			'rr_donnelley_domestic_priority_parcel' => 'RR Donnelley Domestic Priority Parcel ',
			'rr_donnelley_domestic_parcel_bpm' => 'RR Donnelley Domestic Parcel BPM',
			'rr_donnelley_priority_domestic_priority_parcel_bpm' => 'RR Donnelley Domestic Priority Parcel BPM',
			'rr_donnelley_priority_parcel_delcon' => 'RR Donnelley International Priority Parcel DelCon',
			'rr_donnelley_priority_parcel_nondelcon' => 'RR Donnelley International Priority Parcel NonDelcon',
			'rr_donnelley_economy_parcel' => 'RR Donnelley Economy Parcel Service ',
			'rr_donnelley_ipa' => 'RR Donnelley International Priority Airmail (IPA)',
			'rr_donnelley_courier' => 'RR Donnelley International Courier',
			'rr_donnelley_isal' => 'RR Donnelley International Surface Air Lift (ISAL)',
			'rr_donnelley_epacket' => 'RR Donnelley e-Packet',
			'rr_donnelley_pmi' => 'RR Donnelley Priority Mail International',
			'rr_donnelley_emi' => 'RR Donnelley Express Mail International',
			'sendle_parcel' => 'Sendle Parcel',
			'newgistics_parcel_select_lightweight' => 'Newgistics Parcel Select Lightweight',
			'newgistics_parcel_select' => 'Newgistics Parcel Select',
			'newgistics_priority_mail' => 'Newgistics Priority Mail',
			'newgistics_first_class_mail' => 'Newgistics First Class Mail',
			'ontrac_ground' => 'OnTrac Ground',
			'ontrac_sunrise_gold' => 'OnTrac Sunrise Gold',
			'ontrac_sunrise' => 'OnTrac Sunrise',
			'lasership_routed_delivery' => 'Lasership Routed Delivery',
			'hermes_uk_courier_collection' => 'Hermes UK Courier Collection',
			'hermes_uk_parcelshop_dropoff' => 'Hermes UK ParcelShop Drop-Off',
			'FedEx_Box_10kg' => 'FedEx® 10kg Box',
			'FedEx_Box_25kg' => 'FedEx® 25kg Box',
			'FedEx_Box_Extra_Large_1' => 'FedEx® Extra Large Box (X1)',
			'FedEx_Box_Extra_Large_2' => 'FedEx® Extra Large Box (X2)',
			'FedEx_Box_Large_1' => 'FedEx® Large Box (L1)',
			'FedEx_Box_Large_2' => 'FedEx® Large Box (L2)',
			'FedEx_Box_Medium_1' => 'FedEx® Medium Box (M1)',
			'FedEx_Box_Medium_2' => 'FedEx® Medium Box (M2)',
			'FedEx_Box_Small_1' => 'FedEx® Small Box (S1)',
			'FedEx_Box_Small_2' => 'FedEx® Small Box (S2)',
			'FedEx_Envelope' => 'FedEx® Envelope',
			'FedEx_Padded_Pak' => 'FedEx® Padded Pak',
			'FedEx_Pak_1' => 'FedEx® Large Pak',
			'FedEx_Pak_2' => 'FedEx® Small Pak',
			'FedEx_Tube' => 'FedEx® Tube',
			'FedEx_XL_Pak' => 'FedEx® Extra Large Pak',
			'UPS_Box_10kg' => 'Box 10kg',
			'UPS_Box_25kg' => 'Box 25kg',
			'UPS_Express_Box' => 'UPS Express Box',
			'UPS_Express_Box_Large' => 'UPS Express Box Large',
			'UPS_Express_Box_Medium' => 'UPS Express Box Medium',
			'UPS_Express_Box_Small' => 'UPS Express Box Small',
			'UPS_Express_Envelope' => 'UPS Express Envelope',
			'UPS_Express_Hard_Pak' => 'UPS Express Hard Pak',
			'UPS_Express_Legal_Envelope' => 'UPS Express Legal Envelope',
			'UPS_Express_Pak' => 'UPS Express Pak',
			'UPS_Express_Tube' => 'UPS Express Tube',
			'UPS_Laboratory_Pak' => 'Laboratory Pak',
			'UPS_MI_BPM' => 'BPM (Mail Innovations - Domestic &amp; International)',
			'UPS_MI_BPM_Flat' => 'BPM Flat (Mail Innovations - Domestic &amp; International)',
			'UPS_MI_BPM_Parcel' => 'BPM Parcel (Mail Innovations - Domestic &amp; International)',
			'UPS_MI_First_Class' => 'First Class (Mail Innovations - Domestic only)',
			'UPS_MI_Flat' => 'Flat (Mail Innovations - Domestic only)',
			'UPS_MI_Irregular' => 'Irregular (Mail Innovations - Domestic only)',
			'UPS_MI_Machinable' => 'Machinable (Mail Innovations - Domestic only)',
			'UPS_MI_MEDIA_MAIL' => 'Media Mail (Mail Innovations - Domestic only)',
			'UPS_MI_Parcel_Post' => 'Parcel Post (Mail Innovations - Domestic only)',
			'UPS_MI_Priority' => 'Priority (Mail Innovations - Domestic only)',
			'UPS_MI_Standard_Flat' => 'Standard Flat (Mail Innovations - Domestic only)',
			'UPS_Pad_Pak' => 'UPS Pad Pak',
			'UPS_Pallet' => 'UPS Pallet',
			'USPS_FlatRateCardboardEnvelope' => 'USPS Flat Rate Cardboard Envelope',
			'USPS_FlatRateEnvelope' => 'USPS Flat Rate Envelope',
			'USPS_FlatRateGiftCardEnvelope' => 'USPS Flat Rate Gift Card Envelope',
			'USPS_FlatRateLegalEnvelope' => 'USPS Flat Rate Legal Envelope',
			'USPS_FlatRatePaddedEnvelope' => 'USPS Flat Rate Padded Envelope',
			'USPS_FlatRateWindowEnvelope' => 'USPS Flat Rate Window Envelope',
			'USPS_IrregularParcel' => 'USPS Irregular Parcel',
			'USPS_LargeFlatRateBoardGameBox' => 'USPS Large Flat Rate Board Game Box',
			'USPS_LargeFlatRateBox' => 'USPS Large Flat Rate Box',
			'USPS_APOFlatRateBox' => 'USPS APO/FPO/DPO Large Flat Rate Box',
			'USPS_LargeVideoFlatRateBox' => 'USPS Flat Rate Large Video Box (Int\'l only)',
			'USPS_MediumFlatRateBox1' => 'USPS Medium Flat Rate Box 1',
			'USPS_MediumFlatRateBox2' => 'Medium Flat Rate Box 2',
			'USPS_RegionalRateBoxA1' => 'USPS Regional Rate Box A1',
			'USPS_RegionalRateBoxA2' => 'USPS Regional Rate Box A2',
			'USPS_RegionalRateBoxB1' => 'USPS Regional Rate Box B1',
			'USPS_RegionalRateBoxB2' => 'USPS Regional Rate Box B2',
			'USPS_SmallFlatRateBox' => 'USPS Small Flat Rate Box',
			'USPS_SmallFlatRateEnvelope' => 'USPS Small Flat Rate Envelope',
			'USPS_SoftPack' => 'USPS Soft Pack Padded Envelope',
		);
	}
}

endif;
