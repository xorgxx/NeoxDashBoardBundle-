<?php

    namespace NeoxDashBoard\NeoxDashBoardBundle\Controller;

    use NeoxDashBoard\NeoxDashBoardBundle\Entity\NeoxDashSection;
    use NeoxDashBoard\NeoxDashBoardBundle\Pattern\IniHandleNeoxDashModel;
    use NeoxDashBoard\NeoxDashBoardBundle\Services\CrudHandleBuilder;
    use NeoxDashBoard\NeoxDashBoardBundle\Entity\NeoxDashDomain;
    use NeoxDashBoard\NeoxDashBoardBundle\Form\NeoxDashDomainType;
    use Doctrine\ORM\EntityManagerInterface;
    use NeoxDashBoard\NeoxDashBoardBundle\Repository\NeoxDashDomainRepository;
    use NeoxDashBoard\NeoxDashBoardBundle\Services\FindIconOnWebSite;
    use NeoxDashBoard\NeoxDashBoardBundle\Services\ToolsBoxService;
    use Random\RandomException;
    use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
    use Symfony\Component\HttpFoundation\JsonResponse;
    use Symfony\Component\HttpFoundation\Request;
    use Symfony\Component\HttpFoundation\Response;
    use Symfony\Component\Routing\Attribute\Route;
    use Symfony\Component\Security\Csrf\CsrfTokenManagerInterface;
    use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
    use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
    use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
    use Symfony\Contracts\HttpClient\HttpClientInterface;
    use Symfony\UX\Turbo\TurboBundle;

    #[Route('/neox/dash/domain')]
    final class NeoxDashDomainController extends AbstractController
    {

        public function __construct(readonly private CrudHandleBuilder $crudHandleBuilder, readonly FindIconOnWebSite $findIconOnWebSite) {}

        #[Route('/', name: 'app_neox_dash_domain_index', methods: [ 'GET' ])]
        public function index(NeoxDashDomainRepository $neoxDashDomainRepository): Response
        {
            $domains = $neoxDashDomainRepository->findBy([], [ 'Position' => 'ASC' ]);
            return $this->render('@NeoxDashBoardBundle/neox_dash_domain/index.html.twig', [ 'neox_dash_domains' => $domains ]);
        }

        /**
         * @throws RandomException
         * @throws \Exception
         */
        #[Route('/new/{id}', name: 'app_neox_dash_domain_new', methods: [
            'GET',
            'POST'
        ])]
        public function new(Request $request, NeoxDashSection $neoxDashSection): Response|JsonResponse
        {
            //            $crudHandleBuilder = $this->setInit("new", [ "id" => $neoxDashSection->getId() ]);
            $content = $request->getContent();
            $data    = json_decode($content, true) ?? null;


            // build entity
            $neoxDashDomain = new NeoxDashDomain();
            $neoxDashDomain->setSection($neoxDashSection);
            if ($data[ "domain" ] ?? null) {
                $d = $this->findIconOnWebSite->extractDomain($data[ "domain" ]);
                $neoxDashDomain->setName($d[ "domain" ]);
                $neoxDashDomain->setUrl($data[ "domain" ] ?? "");
            }
            $neoxDashDomain->setUrlIcon("z");

            $neoxDashDomain->setColor(ToolsBoxService::getColor());

            // Determine the template to use for rendering and render the builder !!
            $crudHandleBuilder = $this->setInit("new", $neoxDashDomain, [ "id" => $neoxDashSection->getId() ]);

            /*
            * Call to the generic form management service, with support for turbo-stream
            * For kipping this code flexible to return your need
            */

            /*
            *   ===== this is the way to use the generic form management service =====
            *   $handleSubmit = $crudHandleBuilder->handleCreateForm()->preHandleForm($request);
            *   // Handle form submission for any entity, can make entity change if needed and flush entity
            *   $handleSubmit->getIniHandleNeoxDashModel()->getEntity()
            *       ->setUrlIcon($handleSubmit->getIniHandleNeoxDashModel()->getEntity()->getUrlIcon())
            *   ;
            *
            *   return $handleSubmit->flushHandleForm()->render();
            */

            $handleSubmit = $crudHandleBuilder
                ->handleCreateForm()
                ->preHandleForm($request)
            ;
            $url          = $handleSubmit
                ->getIniHandleNeoxDashModel()
                ->getEntity()
                ->geturl()
            ;
            // check if it exist in dBase
            if ($url) {
                $hash = hash('sha256', $url);
                $o    = $crudHandleBuilder->entityManager
                    ->getRepository(neoxDashDomain::class)
                    ->findOneBy([ "hash" => $hash ])
                ;
                if ($o) {
                    return new jsonResponse("exist");
                }
            }

            return $handleSubmit
                ->flushHandleForm()
                ->render()
            ;

            //            return $crudHandleBuilder
            //                ->handleCreateForm()
            //                ->handleForm($request)
            //                ->render()
            //            ;

        }

        /**
         * @param Request         $request
         * @param NeoxDashSection $neoxDashSection
         *
         * @return Response
         * @throws RandomException
         */
        #[Route('/new/batch/{id}', name: 'app_neox_dash_domain_new_batch', methods: [
            'GET',
            'POST'
        ])]
        public function newBatch(Request $request, NeoxDashSection $neoxDashSection): Response|JsonResponse
        {
            // Determine the template to use for rendering and render the builder !!
            $crudHandleBuilder  = $this->setInit("new", $neoxDashSection);
            $return[ "status" ] = "ajax";
            $r                  = [
                "added" => 0,
                "error" => 0
            ];

            $content = $request->getContent();
            $data    = json_decode($content, true) ?? null;

            // S'assurer que `urls` est toujours un tableau
            if (isset($data[ 'urls' ]) && is_string($data[ 'urls' ])) {
                $data[ 'urls' ] = [ $data[ 'urls' ] ];
            }

            if ($data && isset($data[ 'urls' ]) || is_array($data[ 'urls' ])) {

                for ($i = 0; $i < count($data[ 'urls' ]); $i += 2) {

                    // Les index impairs pour les URLs
                    $url  = $data[ 'urls' ][ $i ] ?? null;
                    $name = $data[ 'urls' ][ $i + 1 ] ?? "null"; // Les index pairs pour les noms

                    if ($url && $name) {
                        $pp  = 'URL: ' . htmlspecialchars($url) . PHP_EOL;
                        $ppp = 'Name: ' . htmlspecialchars($name) . PHP_EOL;

                        // check if it exist in dBase
                        if ($url) {
                            $hash = hash('sha256', $url);
                            $o    = $crudHandleBuilder->entityManager
                                ->getRepository(neoxDashDomain::class)
                                ->findOneBy([ "hash" => $hash ])
                            ;
                            if (!$o) {
                                $neoxDashDomain = new NeoxDashDomain();
                                $neoxDashDomain->setSection($neoxDashSection);

                                // Extraction du domaine et configuration de l'entité
                                $domainData = $this->findIconOnWebSite->extractDomain($url);
                                $neoxDashDomain->setName($domainData[ "domain" ] ?? $name);
                                $neoxDashDomain->setUrl($url);
                                $neoxDashDomain->setUrlIcon("z");

                                // Générer une couleur aléatoire
                                $neoxDashDomain->setColor(sprintf("#%02x%02x%02x", random_int(0, 255), random_int(0, 255), random_int(0, 255)));

                                $crudHandleBuilder->entityManager->persist($neoxDashDomain);
                                $r[ "added" ] += 1;
                            }
                            else {
                                $r[ "error" ] += 1;
                            }
                        }

                    }
                    else {
                        echo 'Données URL ou nom manquantes pour l\'index ' . $i . PHP_EOL;
                    }
                }

                $crudHandleBuilder->entityManager->flush();
                $return[ "submit" ] = true;
                $return[ "data" ]   = "Added: " . $r[ "added" ] . " | Error: " . $r[ "error" ];
                $crudHandleBuilder
                    ->getIniHandleNeoxDashModel()
                    ->setReturn($return)
                ;


            }
            else {
                echo 'Aucune URL valide trouvée ou le format est incorrect.';
            }
            return $crudHandleBuilder->render();

            // build entity
        }

        #[Route('/{id}', name: 'app_neox_dash_domain_show', methods: [ 'GET' ])]
        public function show(NeoxDashDomain $neoxDashDomain): Response
        {
            return $this->render('@NeoxDashBoardBundle/neox_dash_domain/show.html.twig', [ 'neox_dash_domain' => $neoxDashDomain, ]);
        }

        /**
         * @throws TransportExceptionInterface
         */
        #[Route('/{id}/edit', name: 'app_neox_dash_domain_edit', methods: [
            'GET',
            'POST'
        ])]
        public function edit(Request $request, NeoxDashDomain $neoxDashDomain): Response|JsonResponse
        {
            // Determine the template to use for rendering and render the builder !!
            $crudHandleBuilder = $this->setInit("edit", $neoxDashDomain);

            //            $icon = $this->findIconOnWebSite->getFaviconUrl($neoxDashDomain->getUrl());
            /*
            * Call to the generic form management service, with support for turbo-stream
            * For kipping this code flexible to return your need
            */

            return $crudHandleBuilder
                ->handleCreateForm()
                ->handleForm($request)
                ->render()
            ;

        }

        #[Route('/exchange-{action}', defaults: [ 'action' => 'index' ], name: 'app_neox_dash_domain_exchange', methods: [
            'GET',
            'POST'
        ])]
        public function exchange(Request $request, string $action, NeoxDashDomainRepository $neoxDashDomainRepository, entityManagerInterface $entityManager): Response|JsonResponse
        {
            $content = $request->getContent();
            $data    = json_decode($content, true) ?? null;

            // Recover both domains
            $draggedDomain = $neoxDashDomainRepository->find($data[ "draggedId" ]);
            $targetDomain  = $neoxDashDomainRepository->find($data[ "targetId" ]);

            if ($draggedDomain && $targetDomain) {
                $tempPosition = $targetDomain->getPosition();
                $draggedDomain->setPosition($tempPosition);

                // Save changes
                $entityManager->flush();

                return new JsonResponse("true");
            }

            return new jsonResponse($targetId
                    ->getSection()
                    ->getId() === $draggedId
                    ->getSection()
                    ->getId());
        }

        #[Route('/{id}', name: 'app_neox_dash_domain_delete', methods: [ 'POST' ])]
        public function delete(Request $request, NeoxDashDomain $neoxDashDomain, EntityManagerInterface $entityManager, CsrfTokenManagerInterface $csrfTokenManager): Response
        {

            $csrfToken = 'delete' . $neoxDashDomain->getId();
            $submit    = $this->isCsrfTokenValid($csrfToken, $request->get('_token'));

            if ($submit) {
                $entityManager->remove($neoxDashDomain);
                $entityManager->flush();
            }

            $crudHandleBuilder = $this->setInit("index");
            $return            = $this->crudHandleBuilder->getRequestType($request);

            return match ($return[ "status" ]) {
                "redirect" => $submit ? $this->redirectToRoute($crudHandleBuilder
                        ->getIniHandleNeoxDashModel()
                        ->getRoute() . 'index', [], Response::HTTP_SEE_OTHER) : null,
                "ajax" => $submit ? new JsonResponse(true) : new JsonResponse(false),
                "turbo" => $submit ? $return[ "data" ] : false,
                default => $this->render($crudHandleBuilder
                    ->getIniHandleNeoxDashModel()
                    ->getNew(), [ 'form' => $form->createView(), ]),
            };
            //            return $this->redirectToRoute('app_neox_dash_domain_index', [], Response::HTTP_SEE_OTHER);
        }

        /**
         * @return IniHandleNeoxDashModel
         */
        public function setInit(string $name = "new", object $object = null, array $params = []): CrudHandleBuilder
        {
            $o = $this->crudHandleBuilder
                ->createNewHandleNeoxDashModel()
                ->setNew("@NeoxDashBoardBundle/neox_dash_domain/$name.html.twig")
                ->setForm('@NeoxDashBoardBundle/neox_dash_domain/_form.html.twig')
                ->setRoute('app_neox_dash_domain')
                ->setParams($params)
                ->setFormInterface(NeoxDashDomainType::class)
                ->setEntity($object)
            ;

            // Determine the template to use for rendering
            return $this->crudHandleBuilder->setHandleNeoxDashModel($o);
        }

        #[Route('/{id}/find-icon', name: 'app_neox_dash_find-icon', methods: [ 'POST' ])]
        public function findIcon(Request $request, NeoxDashSection $neoxDashSection, EntityManagerInterface $entityManager): Response|JsonResponse
        {
            $domains = $neoxDashSection->getNeoxDashDomains();
            foreach ($domains as $domain) {
                $domain->seturlIcon($this->findIconOnWebSite->getFaviconUrl($domain->getname()));
                $entityManager->persist($domain);
            }
            $entityManager->flush();
            $submit            = true;
            $crudHandleBuilder = $this->setInit("index");
            $return            = $this->crudHandleBuilder->getRequestType($request);

            return match ($return[ "status" ]) {
                "redirect" => $submit ? $this->redirectToRoute($crudHandleBuilder
                        ->getIniHandleNeoxDashModel()
                        ->getRoute() . 'index', [], Response::HTTP_SEE_OTHER) : null,
                "ajax" => $submit ? new JsonResponse(true) : new JsonResponse(false),
                "turbo" => $submit ? $return[ "data" ] : false,
                default => null,
            };
        }

        #[Route('/count/{id}', name: 'app_neox_dash_domain_count', methods: [ 'POST' ])]
        public function count(Request $request, NeoxDashDomain $neoxDashDomain, EntityManagerInterface $entityManager): JsonResponse
        {
            try {
                // Récupération des données du corps de la requête
                $data = json_decode($request->getContent(), true);

                if (!is_array($data) || empty($data[ '_token' ])) {
                    return new JsonResponse([
                        'success' => false,
                        'message' => 'Invalid request data'
                    ], 400);
                }

                // Vérification du token CSRF
                if (!$this->isCsrfTokenValid('count-domain' . $neoxDashDomain->getId(), $data[ '_token' ])) {
                    return new JsonResponse([
                        'success' => false,
                        'message' => 'Invalid CSRF token'
                    ], 403);
                }

                // Mise à jour du compteur
                $currentCount = $neoxDashDomain->getCpt();
                $newCount     = $currentCount + 1; // Incrémente de 1 (ou ajustez selon besoin)

                $neoxDashDomain->setCpt($newCount);
                $entityManager->persist($neoxDashDomain);
                $entityManager->flush();

                return new JsonResponse([
                    'success'  => true,
                    'newCount' => $newCount
                ], 200);

            } catch (\Exception $e) {
                // Gestion des erreurs imprévues
                return new JsonResponse([
                    'success' => false,
                    'message' => 'An error occurred'
                ], 500);
            }
        }


    }
